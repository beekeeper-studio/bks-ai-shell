import { log } from "@beekeeperstudio/plugin";
import {
  convertToModelMessages,
  generateObject,
  LanguageModel,
  stepCountIs,
  streamText,
  ToolSet,
} from "ai";
import {
  AvailableModels,
  AvailableProviders,
  defaultTemperature,
  ModelInfo,
} from "@/config";
import { UIMessage } from "@/types";
import { z } from "zod/v3";
import {
  APICallError,
  // InvalidToolArgumentsError,
  NoSuchModelError,
  NoSuchProviderError,
  NoSuchToolError,
  // ToolExecutionError,
} from "ai";
import { ProviderOptions } from "@ai-sdk/provider-utils";

export type Messages = UIMessage[];

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

  abstract getModel(id: string): LanguageModel;

  getProviderOptions(): ProviderOptions | undefined {
    return undefined;
  }

  async stream(options: StreamOptions) {
    const isCompactPrompt =
      options.messages[options.messages.length - 1]?.metadata?.isCompactPrompt;
    const result = streamText({
      model: this.getModel(options.modelId),
      messages: await this.convertToModelMessages(options.messages),
      abortSignal: options.signal,
      system: isCompactPrompt ? undefined : options.systemPrompt,
      tools: isCompactPrompt ? undefined : options.tools,
      stopWhen: stepCountIs(100),
      temperature: options.temperature ?? defaultTemperature,
      providerOptions: this.getProviderOptions(),
    });
    return result.toUIMessageStreamResponse({
      originalMessages: options.messages,
      onError: (error) => {
        log.error(error);
        return this.getErrorMessage(error);
      },
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return {
            createdAt: Date.now(),
            modelId: options.modelId,
            providerId: this.providerId,
            compactStatus: isCompactPrompt ? "processing" : undefined,
          };
        }

        if (part.type === "finish") {
          return {
            usage: part.totalUsage,
            compactStatus: isCompactPrompt ? "complete" : undefined,
          };
        }
      },
    });
  }

  async generateObject<OBJECT>(options: {
    modelId: string;
    schema: z.Schema<OBJECT, z.ZodTypeDef, any>;
    prompt: string;
    temperature?: number;
  }) {
    return await generateObject<OBJECT>({
      model: this.getModel(options.modelId),
      schema: options.schema,
      prompt: options.prompt,
      temperature: options.temperature,
    });
  }

  abstract listModels(): Promise<ModelInfo[]>;

  getErrorMessage(error: unknown) {
    if (NoSuchToolError.isInstance(error)) {
      return "The model tried to call a unknown tool.";
    // } else if (InvalidToolArgumentsError.isInstance(error)) {
    //   return "The model called a tool with invalid arguments.";
    } else if (APICallError.isInstance(error)) {
      if (
        error.data?.error?.code === "invalid_api_key" ||
        error.data?.error?.message === "invalid x-api-key"
      ) {
        return `The API key is invalid.`;
      }
      return `An error occurred during API call. (${error.message})`;
    } else if (NoSuchProviderError.isInstance(error)) {
      return `Provider ${error.providerId} does not exist.`;
    } else if (NoSuchModelError.isInstance(error)) {
      return `Model ${error.modelId} does not exist.`;
    }
    return  `An error occurred. (${error.message})`;
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
