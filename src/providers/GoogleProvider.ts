import type { AvailableProviders, ModelInfo } from "@/config";
import { providerConfigs } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export class GoogleProvider extends BaseProvider {
  constructor(private options: { apiKey: string }) {
    super();
  }

  get providerId(): AvailableProviders {
    return "google";
  }

  getModel(id: string) {
    return createGoogleGenerativeAI({
      apiKey: this.options.apiKey,
    }).languageModel(id);
  }

  async listModels(): Promise<ModelInfo[]> {
    // @ts-expect-error
    return providerConfigs.google.models;
  }
}
