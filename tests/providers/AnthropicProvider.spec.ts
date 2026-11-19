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

  it("opts into dropping thinking blocks that no longer match the conversation", () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    // `config` is internal to the AI SDK model, but it is the only place the
    // headers we pass to createAnthropic() can be observed without a request.
    const headers = (provider.getModel("claude-opus-5") as any).config.headers();

    expect(headers["anthropic-beta"]).toContain(
      "thinking-binding-controls-2026-08-01",
    );
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  it("lists the configured Anthropic models", async () => {
    const provider = new AnthropicProvider({ apiKey: "test-key" });

    await expect(provider.listModels()).resolves.toEqual(
      providerConfigs.anthropic.models,
    );
  });
});
