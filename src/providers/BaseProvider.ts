import { notify } from "@beekeeperstudio/plugin";
import { convertToModelMessages, generateObject, LanguageModel, stepCountIs, streamText, ToolSet } from "ai";
import { AvailableModels, AvailableProviders, defaultTemperature } from "@/config";
import { z } from "zod/v3";
// import { UserRejectedError } from "@/tools";
import {
  APICallError,
  // InvalidToolArgumentsError,
  NoSuchModelError,
  NoSuchProviderError,
  NoSuchToolError,
  // ToolExecutionError,
} from "ai";
import { ProviderOptions } from '@ai-sdk/provider-utils';
import { UIMessage } from "@/types";

export type StreamOptions = {
  messages: UIMessage[];
  signal?: AbortSignal;
  tools: ToolSet;
  modelId: AvailableModels["id"];
  temperature?: number;
  systemPrompt?: string;
}

export abstract class BaseProvider {
  abstract get providerId(): AvailableProviders;

  abstract getModel(id: string): LanguageModel;

  getProviderOptions(): ProviderOptions | undefined {
    return undefined;
  }

  async stream(options: StreamOptions) {
    const result = streamText({
      model: this.getModel(options.modelId),
      messages: await convertToModelMessages<UIMessage>(options.messages, {
        convertDataPart(part) {
          if (part.type === "data-editedQuery") {
            return {
              type: "text",
              text: "Please run the following code instead:\n```\n"
                + part.data.query
                + "\n```",
            };
          }
        },
      }),
      abortSignal: options.signal,
      system: options.systemPrompt,
      tools: options.tools,
      stopWhen: stepCountIs(100),
      temperature: options.temperature ?? defaultTemperature,
      providerOptions: this.getProviderOptions(),
    });
    return result.toUIMessageStreamResponse({
      originalMessages: options.messages,
      onError: (error) => {
        notify("pluginError", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        return this.getErrorMessage(error);
      },
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return {
            createdAt: Date.now(),
            modelId: options.modelId,
            providerId: this.providerId,
          };
        }

        if (part.type === "finish") {
          return {
            usage: part.totalUsage,
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

  abstract listModels(): Promise<
    readonly { id: string; displayName: string }[]
  >;

  getErrorMessage(error: unknown) {
    if (NoSuchToolError.isInstance(error)) {
      return "The model tried to call a unknown tool.";
    // } else if (InvalidToolArgumentsError.isInstance(error)) {
    //   return "The model called a tool with invalid arguments.";
    // } else if (ToolExecutionError.isInstance(error)) {
    //   if (UserRejectedError.isInstance(error.cause)) {
    //     return `User rejected tool call. (toolCallId: ${error.toolCallId})`;
    //   } else {
    //     return "An error occurred during tool execution.";
    //   }
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
}
