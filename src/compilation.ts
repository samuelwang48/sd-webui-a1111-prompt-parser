import { SDPromptParser as sdp } from "./types";

export const compilation = (node: sdp.IPromptASTNode): sdp.IPromptNode[] => {
  switch (node.data as sdp.TreeData) {
    case "start": {
      return node.children?.map(compilation).flat() as sdp.IPromptNode[];
    }
    case "multiple": {
      if (!node.children) return [];
      return node.children
        .map((child) => {
          if (child.data === "plain") {
            return (
              child.children
                ?.filter((c) => c.type === "PLAIN_TEXT")
                .map((c) => ({
                  type: "token",
                  value: c.value!,
                })) || []
            );
          }
          return compilation(child);
        })
        .flat() as sdp.IPromptNode[];
    }
    case "combination": {
      if (!node.children) return [];
      const buffer = [] as sdp.IPromptNode[];
      let bufferNode = null as null | sdp.IPromptNode;
      for (const child of node.children) {
        if (child.data === "plain") {
          if (!bufferNode) {
            bufferNode = {
              type: "token",
              value: "",
            };
          }
          bufferNode.value += " " + child.children?.[0].value;
        } else {
          if (bufferNode) {
            buffer.push(bufferNode);
            bufferNode = null;
          }
          buffer.push(...compilation(child));
        }
      }
      if (bufferNode) {
        bufferNode.value = bufferNode.value.trim();
        buffer.push(bufferNode);
      }
      return buffer;
    }
    case "plain": {
      return [
        {
          type: "token",
          value: node.children?.[0].value!,
        },
      ];
    }
    case "emphasized_positive": {
      if (!node.children) return [];
      let current = node;
      let depth = 0;
      while (current.data === "emphasized_positive") {
        if (!current.children?.[0]) {
          throw new Error("Invalid AST");
        }
        current = current.children?.[0];
        depth++;
      }
      const value = compilation(current);
      return value.map( (el: any) => {
        return {
          type: "positive",
          value: el.value,
          args: depth,
        }
      })
    }
    case "emphasized_negative": {
      if (!node.children) return [];
      let current = node;
      let depth = 0;
      while (current.data === "emphasized_negative") {
        if (!current.children?.[0]) {
          throw new Error("Invalid AST");
        }
        current = current.children?.[0];
        depth++;
      }
      const value = compilation(current);
      return value.map( (el: any) => {
        return {
          type: "negative",
          value: el.value,
          args: depth,
        }
      })
    }
    case "emphasized_weighted": {
      if (!node.children) return [];
      const [combination, number] = node.children;
      if (!combination || !number) {
        throw new Error("Invalid AST");
      }
      const combinationNodes = compilation(combination);
      const number_value = number.children?.[0].value;

      return [
        {
          type: "weighted",
          value: combinationNodes[0].value,
          args: number_value,
        },
      ];
    }
    case "alternate": {
      if (!node.children) return [];
      const sub_nodes = node.children.map(compilation).flat();
      return [
        {
          type: "alternate",
          value: "",
          args: sub_nodes,
        },
      ];
    }
    case "scheduled_to": {
      if (!node.children) return [];
      const [value, number] = node.children;
      return [
        {
          type: "scheduled_to",
          value: number.children?.[0].value!,
          args: compilation(value),
        },
      ];
    }
    case "scheduled_none_to": {
      if (!node.children) return [];
      const [value, number] = node.children;
      return [
        {
          type: "scheduled_to",
          value: number.children?.[0].value!,
          args: compilation(value),
        },
      ];
    }
    case "scheduled_from": {
      if (!node.children) return [];
      const [value, number] = node.children;
      return [
        {
          type: "scheduled_from",
          value: number.children?.[0].value!,
          args: compilation(value),
        },
      ];
    }
    case "scheduled_full": {
      if (!node.children) return [];
      const [from_value, to_value, number] = node.children;
      return [
        {
          type: "scheduled_from",
          value: number.children?.[0].value!,
          args: {
            from: compilation(from_value),
            to: compilation(to_value),
          },
        },
      ];
    }
    case "extra_networks_name": {
      return [
        {
          type: "extra_networks_name",
          value: node.children?.[0].value!,
        },
      ];
    }
    case "extra_networks": {
      if (!node.children) return [];
      const [name, args] = node.children;
      if (!name || !args) {
        throw new Error("Invalid AST");
      }
      const nameValue = name.children?.[0].value!;
      const argsValue = args.children?.map((c) => c.value);
      return [
        {
          type: "extra_networks",
          value: nameValue,
          args: argsValue,
        },
      ];
    }
    default: {
      throw new Error(`Invalid AST: ${node.data} ${node.type || ""}`);
    }
  }
};
