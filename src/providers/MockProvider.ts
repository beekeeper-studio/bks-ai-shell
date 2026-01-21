import { BaseProvider } from "./BaseProvider";
import { AvailableProviders, ModelInfo, providerConfigs } from "@/config";
import { LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";

export class MockProvider extends BaseProvider {
  get providerId(): AvailableProviders {
    return "mock";
  }

  getModel(id: string): LanguageModel {
    const isFast = id === "mock-fast";

    // Helper to calculate tokens based on message count
    const calculateTokens = (messageCount: number) => {
      // Calculate token usage based on model variant
      // For 200K context window:
      // - Reserved output tokens: 32,000
      // - Context limit: 168,000 tokens
      // - Warning at 15% remaining (≥142,800 total tokens)
      // - Overflow at 0% remaining (≥168,000 total tokens)
      let baseInputTokens: number;
      let baseOutputTokens: number;

      if (id === "mock-high-usage") {
        // Start at 70% usage, each message adds ~5% (3 messages to reach warning)
        const tokensPerMessage = 8_400;
        const startingTokens = 117_600; // 70% of 168,000
        const totalTokens = startingTokens + (messageCount * tokensPerMessage);
        baseInputTokens = Math.floor(totalTokens * 0.4);
        baseOutputTokens = Math.floor(totalTokens * 0.6);
      } else if (id === "mock-overflow") {
        // Start at 90% usage, each message adds ~5% (2 messages to reach overflow)
        const tokensPerMessage = 8_400;
        const startingTokens = 151_200; // 90% of 168,000
        const totalTokens = startingTokens + (messageCount * tokensPerMessage);
        baseInputTokens = Math.floor(totalTokens * 0.4);
        baseOutputTokens = Math.floor(totalTokens * 0.6);
      } else {
        // Normal usage: grows gradually (50 base + 20 per message)
        baseInputTokens = 50 + (messageCount * 20);
        baseOutputTokens = 40;
      }

      return { inputTokens: baseInputTokens, outputTokens: baseOutputTokens };
    };

    const baseModel = new MockLanguageModelV3({
      modelId: id,
      provider: this.providerId,
      doGenerate: async ({ prompt }: { prompt: any }) => {
        // Count messages in the conversation (user + assistant messages)
        const messageCount = Array.isArray(prompt) ? prompt.length : 0;
        const tokens = calculateTokens(messageCount);

        return {
          // For generateObject (title generation) - simple text response
          content: [
            {
              type: "text",
              text: '{"title": "Mock conversation"}',
            },
          ],
          finishReason: {
            unified: "stop",
            raw: undefined,
          },
          usage: {
            inputTokens: {
              total: tokens.inputTokens,
              cacheRead: undefined,
              cacheWrite: undefined,
              noCache: tokens.inputTokens,
            },
            outputTokens: {
              total: tokens.outputTokens,
              text: tokens.outputTokens,
              reasoning: undefined,
            },
          },
          warnings: [],
        };
      },
      doStream: async ({ prompt }: { prompt: any }) => {
        // Count messages in the conversation (user + assistant messages)
        const messageCount = Array.isArray(prompt) ? prompt.length : 0;
        const tokens = calculateTokens(messageCount);

        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "text-start", id: "text-1" },
              {
                type: "text-delta",
                id: "text-1",
                delta: "This is a mock response for development testing. ",
              },
              {
                type: "text-delta",
                id: "text-1",
                delta: "The mock models simulate AI responses without making actual API calls.\n\n",
              },
              {
                type: "text-delta",
                id: "text-1",
                delta: "You can use this to test loading states, ",
              },
              {
                type: "text-delta",
                id: "text-1",
                delta: "verify UI layout, and develop features without API costs.",
              },
              { type: "text-end", id: "text-1" },
              {
                type: "finish",
                finishReason: { unified: "stop", raw: undefined },
                usage: {
                  inputTokens: {
                    total: tokens.inputTokens,
                    cacheRead: undefined,
                    cacheWrite: undefined,
                    noCache: tokens.inputTokens,
                  },
                  outputTokens: {
                    total: tokens.outputTokens,
                    text: tokens.outputTokens,
                    reasoning: undefined,
                  },
                },
              },
            ],
            chunkDelayInMs: isFast ? 50 : 400,
            initialDelayInMs: isFast ? 100 : 800,
          }),
        };
      },
    });

    return baseModel;
  }

  async listModels(): Promise<ModelInfo[]> {
    return providerConfigs.mock.models;
  }
}
