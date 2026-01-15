import { AvailableProviders, ModelInfo, providerConfigs } from "@/config";
import { BaseProvider, StreamOptions } from "@/providers/BaseProvider";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";

export class OpenAIProvider extends BaseProvider {
  constructor(private options: { apiKey: string }) {
    super();
  }

  get providerId(): AvailableProviders {
    return "openai";
  }

  getModel(id: string) {
    return createOpenAI({
      apiKey: this.options.apiKey,
    }).languageModel(id);
  }

  stream(options: StreamOptions) {
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

  async listModels(): Promise<ModelInfo[]> {
    return providerConfigs.openai.models;
  }
}
