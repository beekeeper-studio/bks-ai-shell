import { providerConfigs } from "../../src/config";
import { DeepSeekProvider } from "../../src/providers/DeepSeekProvider";
import { describe, expect, it } from "vitest";

describe("DeepSeekProvider", () => {
  it("creates DeepSeek language models through the AI SDK provider", () => {
    const provider = new DeepSeekProvider({
      apiKey: "test-key",
    });

    const model = provider.getModel("deepseek-v4-flash");

    expect(model.provider).toBe("deepseek.chat");
    expect(model.modelId).toBe("deepseek-v4-flash");
  });

  it("lists the configured DeepSeek models", async () => {
    const provider = new DeepSeekProvider({
      apiKey: "test-key",
    });

    await expect(provider.listModels()).resolves.toEqual(
      providerConfigs.deepseek.models,
    );
  });
});
