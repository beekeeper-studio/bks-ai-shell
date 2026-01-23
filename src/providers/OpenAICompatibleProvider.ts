import { AvailableProviders, ModelInfo } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(
    protected options: {
      baseURL: string;
      headers: Record<string, string>;
      apiKey: string;
    },
  ) {
    super();
  }

  get providerId(): AvailableProviders {
    return "openaiCompat";
  }

  getModel(id: string) {
    return createOpenAICompatible({
      baseURL: this.options.baseURL,
      apiKey: this.options.apiKey,
      headers: this.options.headers,
      name: "OpenAI Compatible (AI Shell)",
    }).languageModel(id);
  }

  async listModels(): Promise<ModelInfo[]> {
    const url = new URL("./models", this.options.baseURL);

    const res = await fetch(url.toString(), {
      headers: this.buildFetchHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(`Failed to list models: ${data.error}`);
    }
    if (!Array.isArray(data.data)) {
      // use log.warn from @beekeeperstudio/plugin
      console.warn("Provider returns invalid data", this.options.baseURL, data);
      return [];
    }
    try {
      return (data.data as any[]).map<ModelInfo>((m) => ({
        id: m.id,
        displayName: m.name ?? m.id,
        contextWindow: m.context_length,
      }));
    } catch (e) {
      throw new Error(`Failed to list models: ${e}`);
    }
  }

  protected buildFetchHeaders() {
    const headers = {};
    if (this.options.apiKey) {
      headers["Authorization"] = `Bearer ${this.options.apiKey}`;
    }
    return {
      ...headers,
      ...this.options.headers,
    };
  }
}
