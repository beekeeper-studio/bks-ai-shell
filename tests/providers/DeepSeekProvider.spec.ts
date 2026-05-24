import { afterEach, describe, expect, it, vi } from "vitest";
import { DeepSeekProvider } from "../../src/providers/DeepSeekProvider";

describe("DeepSeekProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates DeepSeek language models through the AI SDK provider", () => {
    const provider = new DeepSeekProvider({
      baseURL: "https://api.deepseek.com",
      apiKey: "test-key",
      headers: {},
    });

    const model = provider.getModel("deepseek-v4-flash");

    expect(model.provider).toBe("deepseek.chat");
    expect(model.modelId).toBe("deepseek-v4-flash");
  });

  it("lists models from the configured DeepSeek API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash",
            context_length: 128000,
          },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DeepSeekProvider({
      baseURL: "https://api.deepseek.com",
      apiKey: "test-key",
      headers: { "X-Test": "1" },
    });

    await expect(provider.listModels()).resolves.toEqual([
      {
        id: "deepseek-v4-flash",
        displayName: "DeepSeek V4 Flash",
        contextWindow: 128000,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("https://api.deepseek.com/models", {
      headers: {
        Authorization: "Bearer test-key",
        "X-Test": "1",
      },
    });
  });
});
