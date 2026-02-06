import { BaseProvider } from "./BaseProvider";
import type { AvailableProviders, ModelInfo } from "@/config";
import { providerConfigs } from "@/config";
import type { LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";

export class MockProvider extends BaseProvider {
  get providerId(): AvailableProviders {
    return "mock";
  }

  getModel(id: string): LanguageModel {
    // Helper to calculate tokens based on message count
    const calculateTokens = (messageCount: number) => {
      let baseInputTokens: number;
      let baseOutputTokens: number;

      if (id === "mock-compact") {
        // mock-compact: 64K context window, 30% usage per message
        // - Reserved output tokens: 16,000 (25% of 64K)
        // - Context limit: 48,000 tokens
        // - Each message adds 30%: 14,400 tokens
        // - Warning at 15% remaining (≥40,800 tokens) - after message 3
        // - Overflow at 0% remaining (≥48,000 tokens) - after message 4
        const tokensPerMessage = 14_400;
        const totalTokens = messageCount * tokensPerMessage;
        baseInputTokens = Math.floor(totalTokens * 0.4);
        baseOutputTokens = Math.floor(totalTokens * 0.6);
      } else {
        // mock: 32K context window, normal low usage
        // - Normal usage: 50 input + 40 output per message = 90 tokens
        baseInputTokens = 50;
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

        // Generate response text based on model type
        let responseText: string;
        if (id === "mock-compact") {
          responseText =
            "This is **Mock compact** - a test model for development.\n\n" +
            "**Context window:** 64K tokens\n\n" +
            "**Usage pattern:** Each message adds 30% to context usage\n\n" +
            "**Purpose:** Test auto-compact feature (warning after ~3 messages, overflow after ~4 messages)\n\n" +
            "Use this model to verify context management and auto-compact behavior without API costs.";
        } else {
          responseText =
            "This is **Mock** - a test model for development.\n\n" +
            "**Context window:** 32K tokens\n\n" +
            "**Usage pattern:** Normal low usage (~90 tokens per message)\n\n" +
            "**Purpose:** General testing and development without API costs\n\n" +
            "Use this model for testing UI, features, and workflows. For testing auto-compact, use **Mock compact** instead.";
        }

        // Split text into chunks for streaming (split by words, ~5-8 words per chunk)
        const words = responseText.split(" ");
        const textChunks: string[] = [];
        for (let i = 0; i < words.length; i += 6) {
          const chunk = words.slice(i, i + 6).join(" ");
          textChunks.push(i + 6 < words.length ? chunk + " " : chunk);
        }

        // Create stream chunks
        const chunks = [
          { type: "text-start" as const, id: "text-1" },
          ...textChunks.map(text => ({
            type: "text-delta" as const,
            id: "text-1",
            delta: text,
          })),
          { type: "text-end" as const, id: "text-1" },
        ];

        return {
          stream: simulateReadableStream({
            chunks: [
              ...chunks,
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
            chunkDelayInMs: 100,
            initialDelayInMs: 200,
          }),
        };
      },
    });

    return baseModel;
  }

  async listModels(): Promise<ModelInfo[]> {
    // @ts-expect-error
    return providerConfigs.mock.models;
  }
}
