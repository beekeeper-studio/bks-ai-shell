import { AvailableModels, providerConfigs } from "@/config";
import { BaseProvider, Messages } from "@/providers/BaseProvider";
import { createOpenAI } from "@ai-sdk/openai";
import { ToolSet } from "ai";
import { z } from "zod";

export class OpenAIProvider extends BaseProvider {
  constructor(private options: { apiKey: string }) {
    super();
  }

  getModel(id: string) {
    return createOpenAI({
      compatibility: "strict",
      apiKey: this.options.apiKey,
    }).languageModel(id);
  }

  stream(options: {
    messages: Messages;
    signal: AbortSignal;
    tools: ToolSet;
    modelId: AvailableModels<"openai">["id"];
    temperature?: number;
  }) {
    if (options.modelId.startsWith("gpt-5")) {
      // Can't set temperature for gpt-5
      return super.stream({ ...options, temperature: 1 });
    }
    return super.stream(options);
  }

  async generateObject<OBJECT>(options: {
    modelId: string;
    schema: z.Schema<OBJECT, z.ZodTypeDef, any>;
    prompt: string;
    temperature?: number;
  }) {
    if (options.modelId === "gpt-5") {
      // Can't set temperature for gpt-5
      return super.generateObject({ ...options, temperature: 1 });
    }
    return super.generateObject(options);
  }

  async listModels() {
    return providerConfigs.openai.models;
  }
}
