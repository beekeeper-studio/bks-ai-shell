import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { withoutReasoningParts } from "../src/utils";

function assistantMessage(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", role: "assistant", parts };
}

describe("withoutReasoningParts", () => {
  it("removes reasoning parts and keeps everything else", () => {
    const messages: UIMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
      assistantMessage([
        { type: "step-start" },
        {
          type: "reasoning",
          text: "thinking...",
          providerMetadata: { anthropic: { signature: "sig" } },
        },
        { type: "text", text: "hello" },
      ]),
    ];

    expect(withoutReasoningParts(messages)).toEqual([
      messages[0],
      assistantMessage([{ type: "step-start" }, { type: "text", text: "hello" }]),
    ]);
  });

  it("leaves messages without reasoning untouched", () => {
    const messages: UIMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
    ];

    const result = withoutReasoningParts(messages);

    expect(result[0]).toBe(messages[0]);
  });
});
