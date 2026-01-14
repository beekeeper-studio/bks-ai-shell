// forked from https://github.com/vercel/ai/blob/115b7dc04896615c99982301a469010a634335c1/packages/ai/src/ui/last-assistant-message-is-complete-with-approval-responses.ts

import { isToolUIPart, type UIMessage } from "ai";

/**
Check if the last message is an assistant message with completed tool call approvals.
The last step of the message must have at least one tool approval response and
all tool approvals must have a response and approved.
 */
export function lastAssistantMessageIsCompleteWithApprovedResponses({
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
    .filter(isToolUIPart)
    .filter((part) => !part.providerExecuted);

  return (
    // has at least one tool approval response
    lastStepToolInvocations.filter(
      (part) => part.state === "approval-responded",
    ).length > 0 &&
    // stop when there is an unapproved response
    lastStepToolInvocations.filter(
      (part) => part.state === "approval-responded" && !part.approval.approved,
    ).length === 0 &&
    // all tool approvals must have a response
    lastStepToolInvocations.every(
      (part) =>
        part.state === "output-available" ||
        part.state === "output-error" ||
        part.state === "approval-responded",
    )
  );
}
