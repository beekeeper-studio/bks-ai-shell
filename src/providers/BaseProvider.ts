import { notify } from "@beekeeperstudio/plugin";
import { generateObject, LanguageModel, streamText, ToolSet } from "ai";
import { AvailableModels, defaultTemperature } from "@/config";
import z from "zod";
import { UserRejectedError } from "@/tools";
import {
  APICallError,
  InvalidToolArgumentsError,
  NoSuchModelError,
  NoSuchProviderError,
  NoSuchToolError,
  ToolExecutionError,
} from "ai";

export type Messages = Parameters<typeof streamText>[0]["messages"];

export abstract class BaseProvider {
  abstract getModel(id: string): LanguageModel;

  async stream(options: {
    messages: Messages;
    signal: AbortSignal;
    tools: ToolSet;
    modelId: AvailableModels["id"];
    temperature?: number;
    systemPrompt?: string;
    maxSteps?: number;
  }) {
    const result = streamText({
      model: this.getModel(options.modelId),
      messages: options.messages,
      abortSignal: options.signal,
      system: options.systemPrompt,
      tools: options.tools,
      maxSteps: options.maxSteps ?? 20,
      temperature: options.temperature ?? defaultTemperature,
    });
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        notify("pluginError", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        return this.getErrorMessage(error);
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
    } else if (InvalidToolArgumentsError.isInstance(error)) {
      return "The model called a tool with invalid arguments.";
    } else if (ToolExecutionError.isInstance(error)) {
      if (UserRejectedError.isInstance(error.cause)) {
        return `User rejected tool call. (toolCallId: ${error.toolCallId})`;
      } else {
        return "An error occurred during tool execution.";
      }
    } else if (APICallError.isInstance(error)) {
      if (
        error.data?.error?.code === "invalid_api_key" ||
        error.data?.error?.message === "invalid x-api-key" ||
        error.data?.error?.code === 400
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
