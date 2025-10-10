// Forked and modified from https://github.com/vercel/ai/blob/276ebc2dfa9acfee69becfe34cd4e91d396207f1/packages/ai/src/ui/last-assistant-message-is-complete-with-tool-calls.ts

import { userRejectedToolCall } from "@/tools";
import { isToolOrDynamicToolUIPart, type UIMessage } from "ai";

/**
Check if the message is an assistant message with completed tool calls.
The last step of the message must have at least one tool invocation and
all tool invocations must have a result that is not user rejected.
 */
export function lastAssistantMessageIsCompleteWithToolCalls({
  messages,
}: {
  messages: UIMessage[];
}): boolean {
  const message = messages[messages.length - 1];

  if (!message) {
    return false;
  }

  if (message.role !== "assistant") {
    return false;
  }

  const lastStepStartIndex = message.parts.reduce((lastIndex, part, index) => {
    return part.type === "step-start" ? index : lastIndex;
  }, -1);

  const lastStepToolInvocations = message.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolOrDynamicToolUIPart);

  return (
    lastStepToolInvocations.length > 0 &&
    lastStepToolInvocations.every(
      (part) =>
        part.state === "output-available" ||
        (part.state === "output-error" &&
          part.errorText !== userRejectedToolCall),
    )
  );
}
