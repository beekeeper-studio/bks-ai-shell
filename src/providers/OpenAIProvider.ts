import { providerConfigs } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createOpenAI } from "@ai-sdk/openai";

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

  async listModels() {
    return providerConfigs.openai.models;
  }
}
