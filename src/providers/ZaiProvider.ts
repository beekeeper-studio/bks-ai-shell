import type { AvailableProviders, ModelInfo } from "@/config";
import { providerConfigs } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createZhipu } from "zhipu-ai-provider";

const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";

export class ZaiProvider extends BaseProvider {
  constructor(private options: { apiKey: string }) {
    super();
  }

  get providerId(): AvailableProviders {
    return "zai";
  }

  getModel(id: string) {
    return createZhipu({
      baseURL: ZAI_BASE_URL,
      apiKey: this.options.apiKey,
    }).languageModel(id);
  }

  async listModels(): Promise<ModelInfo[]> {
    // @ts-expect-error
    return providerConfigs.zai.models;
  }
}
