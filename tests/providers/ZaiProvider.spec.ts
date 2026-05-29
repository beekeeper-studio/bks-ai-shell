import { providerConfigs } from "../../src/config";
import { ZaiProvider } from "../../src/providers/ZaiProvider";
import { describe, expect, it } from "vitest";

describe("ZaiProvider", () => {
  it("creates Z.AI language models through the AI SDK provider", () => {
    const provider = new ZaiProvider({
      apiKey: "test-key",
    });

    const model = provider.getModel("glm-5.1");

    expect(model.provider).toBe("zhipu.chat");
    expect(model.modelId).toBe("glm-5.1");
  });

  it("lists the configured Z.AI GLM models", async () => {
    const provider = new ZaiProvider({
      apiKey: "test-key",
    });

    await expect(provider.listModels()).resolves.toEqual(
      providerConfigs.zai.models,
    );
  });
});
