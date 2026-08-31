import { log } from "@beekeeperstudio/plugin";
import {
  convertToModelMessages,
  generateText,
  type LanguageModel,
  isStepCount,
  streamText,
  type ToolSet,
  toUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type {
  AvailableModels,
  AvailableProviders,
  ModelInfo,
} from "@/config";
import { defaultTemperature, providerConfigs } from "@/config";
import type { UIMessage } from "@/types";
import {
  APICallError,
  // InvalidToolArgumentsError,
  NoSuchModelError,
  NoSuchProviderError,
  NoSuchToolError,
  // ToolExecutionError,
} from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";

export type Messages = UIMessage[];

export type ModelOptions = {
  /** Whether the model is allowed to think before answering. Defaults to true. */
  reasoning?: boolean;
};

export type StreamOptions = {
  messages: Messages;
  signal?: AbortSignal;
  tools: ToolSet;
  modelId: AvailableModels["id"];
  temperature?: number;
  systemPrompt?: string;
};

export abstract class BaseProvider {
  abstract get providerId(): AvailableProviders;

  abstract getModel(id: string, options?: ModelOptions): LanguageModel;

  getProviderOptions(): ProviderOptions | undefined {
    return undefined;
  }

  async stream(options: StreamOptions) {
    const isCompactPrompt =
      options.messages[options.messages.length - 1]?.metadata?.isCompactPrompt;
    const config = providerConfigs[this.providerId]
      .models
      .find((m) => m.id === options.modelId);
    const result = streamText({
      model: this.getModel(options.modelId),
      messages: await this.convertToModelMessages(options.messages),
      abortSignal: options.signal,
      instructions: isCompactPrompt ? undefined : options.systemPrompt,
      tools: isCompactPrompt ? undefined : options.tools,
      stopWhen: isStepCount(100),
      temperature: options.temperature ?? config?.temperature ?? defaultTemperature,
      providerOptions: this.getProviderOptions(),
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream<ToolSet, UIMessage>({
        stream: result.stream,
        originalMessages: options.messages,
        onError: (error) => {
          log.error(error as Error);
          return this.getErrorMessage(error);
        },
        messageMetadata: ({ part }) => {
          if (part.type === "start") {
            return {
              createdAt: Date.now(),
              modelId: options.modelId,
              providerId: this.providerId,
              compactStatus: isCompactPrompt ? "processing" as const : undefined,
            };
          }

          if (part.type === "finish") {
            return {
              usage: part.totalUsage,
              compactStatus: isCompactPrompt ? "complete" as const : undefined,
            };
          }
        },
      }),
    });
  }

  async generateTitle(options: {
    modelId: string;
    messages: Messages;
  }): Promise<string> {
    const conversation = options.messages
      .flatMap((m) => m.parts)
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ");
    const result = await generateText({
      model: this.getModel(options.modelId, { reasoning: false }),
      reasoning: "none",
      // Providers that ignore the reasoning setting still think before answering, so leave room for that.
      maxOutputTokens: 512,
      prompt:
        "Name this conversation in less than 30 characters or 6 words. Reply with the name only.\n``` " +
        conversation +
        "\n```",
    });
    return result.text.trim();
  }

  abstract listModels(): Promise<ModelInfo[]>;

  getErrorMessage(error: any) {
    if (NoSuchToolError.isInstance(error)) {
      return "The model tried to call a unknown tool.";
    // } else if (InvalidToolArgumentsError.isInstance(error)) {
    //   return "The model called a tool with invalid arguments.";
    } else if (APICallError.isInstance(error)) {
      if (
        (error.data as any)?.error?.code === "invalid_api_key" ||
        (error.data as any)?.error?.message === "invalid x-api-key"
      ) {
        return `The API key is invalid.`;
      }
      return `An error occurred during API call. (${error.message})`;
    } else if (NoSuchProviderError.isInstance(error)) {
      return `Provider ${error.providerId} does not exist.`;
    } else if (NoSuchModelError.isInstance(error)) {
      return `Model ${error.modelId} does not exist.`;
    }
    return  `An error occurred. (${error?.message ?? "Unknown error"})`;
  }

  private async convertToModelMessages(messages: UIMessage[]) {
    return await convertToModelMessages<UIMessage>(messages, {
      convertDataPart(part) {
        if (part.type === "data-editedQuery") {
          return {
            type: "text",
            text:
              "Please run the following code instead:\n```\n" +
              part.data.query +
              "\n```",
          };
        }
      },
    });
  }
}
