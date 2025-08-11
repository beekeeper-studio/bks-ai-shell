import { providerConfigs } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export class GoogleProvider extends BaseProvider {
  constructor(private options: { apiKey: string }) {
    super();
  }

  getModel(id: string) {
    return createGoogleGenerativeAI({
      apiKey: this.options.apiKey,
    }).languageModel(id);
  }

  async listModels() {
    return providerConfigs.google.models;
  }
}
