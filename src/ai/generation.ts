import {
  generateObject,
  InvalidToolArgumentsError,
  Message,
  NoSuchToolError,
  streamText,
  ToolExecutionError,
} from "ai";
import {
  getDefaultInstructions,
  defaultTemperature,
  AvailableProviders,
  AvailableModels,
} from "@/config";
import { tools } from "@/tools";
import { createProvider } from "./providerFactory";
import { z } from "zod";

type GenerationOptions<T extends AvailableProviders> = {
  providerId: T;
  modelId: AvailableModels<T>["id"];
  apiKey?: string;
};

export async function chatFetch(_input: unknown, init: RequestInit) {
  const body = JSON.parse(init.body as string) as any;
  const options: GenerationOptions<AvailableProviders> = body.data;

  const model = createProvider(options.providerId, {
    apiKey: options.apiKey,
  }).chat(options.modelId);

  const result = streamText({
    model,
    messages: body.messages,
    abortSignal: init.signal!,
    system: await getDefaultInstructions(),
    tools,
    maxSteps: 10,
    temperature: defaultTemperature,
  });

  return result.toDataStreamResponse({
    getErrorMessage: (error) => {
      if (NoSuchToolError.isInstance(error)) {
        return "The model tried to call a unknown tool.";
      } else if (InvalidToolArgumentsError.isInstance(error)) {
        return "The model called a tool with invalid arguments.";
      } else if (ToolExecutionError.isInstance(error)) {
        return `Error occurred during tool execution: ${error.message}`;
      } else {
        return "An unknown error occurred.";
      }
    },
  });
}

export async function generateTitle<T extends AvailableProviders>(
  options: GenerationOptions<T> & { messages: Message[] },
) {
  const model = createProvider(options.providerId, {
    apiKey: options.apiKey,
  }).languageModel(options.modelId);
  const res = await generateObject({
    model,
    schema: z.object({
      title: z.string().describe("The title of the conversation"),
    }),
    prompt:
      "Name this conversation in less than 30 characters.\n```" +
      options.messages.map((m) => `${m.role}: ${m.content}`).join("\n") +
      "\n```",
  });
  return res.object.title;
}
