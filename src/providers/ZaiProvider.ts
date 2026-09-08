import type { AvailableProviders, ModelInfo } from "@/config";
import { providerConfigs } from "@/config";
import { BaseProvider, type ModelOptions } from "@/providers/BaseProvider";
import { createZhipu, type ZhipuProvider } from "zhipu-ai-provider";

const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";

export class ZaiProvider extends BaseProvider {
  private provider: ZhipuProvider;

  constructor(private options: { apiKey: string }) {
    super();
    this.provider = createZhipu({
      baseURL: ZAI_BASE_URL,
      apiKey: this.options.apiKey,
    });
  }

  get providerId(): AvailableProviders {
    return "zai";
  }

  getModel(id: string, options?: ModelOptions) {
    return this.provider.languageModel(id, {
      thinking: {
        type: !options?.reasoning ? "disabled" : "enabled",
      },
    });
  }

  async listModels(): Promise<ModelInfo[]> {
    // @ts-expect-error
    return providerConfigs.zai.models;
  }
}
