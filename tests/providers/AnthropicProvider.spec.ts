import { AnthropicProvider } from "../../src/providers/AnthropicProvider";
import { providerConfigs } from "../../src/config";
import { describe, expect, it } from "vitest";

describe("AnthropicProvider", () => {
  it("creates Anthropic language models through the AI SDK provider", () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    const model = provider.getModel("claude-opus-5");

    expect(model.provider).toBe("anthropic.messages");
    expect(model.modelId).toBe("claude-opus-5");
  });

  it("drops thinking blocks that no longer match the conversation", () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    expect(provider.getProviderOptions("claude-opus-5")).toEqual({
      anthropic: {
        thinking: {
          type: "adaptive",
          blockBinding: { prefixMismatchBehavior: "drop_block" },
        },
      },
    });
  });

  it("names the thinking type, which claude-fable-5 and claude-opus-5 require", () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    for (const id of ["claude-fable-5", "claude-opus-5"]) {
      const thinking = (provider.getProviderOptions(id) as any).anthropic
        .thinking;
      expect(thinking.type).toBe("adaptive");
    }
  });

  it("sends no thinking config to models that do not think by default", () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    // These models accept a temperature, which the AI SDK only forwards while
    // thinking is off, and the ones older than claude-sonnet-4-6 reject
    // "adaptive" outright.
    for (const id of [
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "claude-opus-4-5-20251101",
      "claude-haiku-4-5-20251001",
    ]) {
      expect(provider.getProviderOptions(id)).toBeUndefined();
    }
  });

  it("sends no thinking config for an unknown model", () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    expect(provider.getProviderOptions("claude-from-the-future")).toBeUndefined();
  });

  it("lists the configured Anthropic models", async () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    await expect(provider.listModels()).resolves.toEqual(
      providerConfigs.anthropic.models,
    );
  });
});
