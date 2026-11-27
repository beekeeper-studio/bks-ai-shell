import type { AvailableProviders, ModelInfo } from "@/config";
import { providerConfigs } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ProviderOptions } from "@ai-sdk/provider-utils";

export class AnthropicProvider extends BaseProvider {
  constructor(private options: { apiKey: string }) {
    super();
  }

  get providerId(): AvailableProviders {
    return "anthropic";
  }

  getModel(id: string) {
    return createAnthropic({
      apiKey: this.options.apiKey,
      headers: { "anthropic-dangerous-direct-browser-access": "true" },
    }).languageModel(id);
  }

  getProviderOptions(modelId: string): ProviderOptions | undefined {
    const model = providerConfigs.anthropic.models.find((m) => m.id === modelId);

    if (!model?.adaptiveThinking) {
      return undefined;
    }

    return {
      anthropic: {
        thinking: {
          type: "adaptive",
          blockBinding: { prefixMismatchBehavior: "drop_block" },
        },
      },
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    // @ts-expect-error
    return providerConfigs.anthropic.models;
  }
}
