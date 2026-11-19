import type { AvailableProviders, ModelInfo } from "@/config";
import { providerConfigs } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createAnthropic } from "@ai-sdk/anthropic";

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
      headers: {
        "anthropic-dangerous-direct-browser-access": "true",
        // Without this, newer models error because it is seeing blocks of the convo it has seen before
        "anthropic-beta": "thinking-binding-controls-2026-08-01",
      },
    }).languageModel(id);
  }

  async listModels(): Promise<ModelInfo[]> {
    // @ts-expect-error
    return providerConfigs.anthropic.models;
  }
}
