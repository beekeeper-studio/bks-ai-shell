// This file is used to migrate from ai-sdk v4 to v5

type PartV4 =
  | {
    type: "text";
    text: string;
  }
  | {
    type: "tool-invocation";
    toolInvocation: {
      state: "result";
      step: number;
      toolCallId: string;
      toolName: string;
      args: unknown;
      result: unknown;
    };
  }
  | {
    type: "step-start";
  };

type PartV5 =
  | {
    type: "text";
    text: string;
  }
  | {
    type: "reasoning";
    text: string;
  }
  | {
    type: `tool-${string}`;
    toolCallId: string;
    state: "input-available";
    input: unknown;
  }
  | {
    type: `tool-${string}`;
    toolCallId: string;
    state: "output-available";
    input: unknown;
    output: unknown;
  }
  | {
    type: "step-start";
  };

export type MessageV4 = {
  id: string;
  role: "system" | "user" | "assistant";
  createdAt: string;
  content: string;
  parts: PartV4[];
};

type MessageV5 = {
  id: string;
  role: "system" | "user" | "assistant";
  parts: PartV5[];
};

export function mapV4MessagesToV5Messages(messages: MessageV4[]): MessageV5[] {
  return messages.map<MessageV5>((message) => {
    return {
      id: message.id,
      role: message.role,
      parts: message.parts
        .map<PartV5 | null>((part) => {
          if (part.type === "step-start") {
            return { type: "step-start" };
          }
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "tool-invocation") {
            return {
              type: `tool-${part.toolInvocation.toolName}`,
              toolCallId: part.toolInvocation.toolCallId,
              state: "output-available",
              input: part.toolInvocation.args,
              output: part.toolInvocation.result,
            };
          }
          return null;
        })
        .filter((part) => part !== null),
    };
  });
}
