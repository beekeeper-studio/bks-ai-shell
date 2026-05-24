import type { AvailableProviders, ModelInfo } from "@/config";
import { BaseProvider } from "@/providers/BaseProvider";
import { createDeepSeek } from "@ai-sdk/deepseek";

const DEFAULT_BASE_URL = "https://api.deepseek.com";

type DeepSeekModelsResponse = {
  data?: {
    id?: string;
    name?: string;
    context_length?: number;
  }[];
  error?: string | { message?: string };
};

export class DeepSeekProvider extends BaseProvider {
  constructor(
    protected options: {
      baseURL?: string;
      headers: Record<string, string>;
      apiKey: string;
    },
  ) {
    super();
  }

  get providerId(): AvailableProviders {
    return "deepseek";
  }

  getModel(id: string) {
    return createDeepSeek({
      baseURL: this.baseURL,
      apiKey: this.options.apiKey,
      headers: this.options.headers,
    }).languageModel(id);
  }

  async listModels(): Promise<ModelInfo[]> {
    const url = new URL("./models", `${this.baseURL}/`);

    const res = await fetch(url.toString(), {
      headers: this.buildFetchHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.statusText}`);
    }

    const data = (await res.json()) as DeepSeekModelsResponse;
    if (data.error) {
      throw new Error(`Failed to list models: ${this.errorMessage(data.error)}`);
    }
    if (!Array.isArray(data.data)) {
      console.warn("Provider returns invalid data", this.baseURL, data);
      return [];
    }

    try {
      return data.data
        .filter((m) => typeof m.id === "string")
        .map<ModelInfo>((m) => ({
          id: m.id!,
          displayName: m.name ?? m.id!,
          contextWindow: m.context_length,
        }));
    } catch (e) {
      throw new Error(`Failed to list models: ${e}`);
    }
  }

  protected buildFetchHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.options.apiKey) {
      headers["Authorization"] = `Bearer ${this.options.apiKey}`;
    }
    return {
      ...headers,
      ...this.options.headers,
    };
  }

  private get baseURL() {
    return this.options.baseURL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
  }

  private errorMessage(error: NonNullable<DeepSeekModelsResponse["error"]>) {
    return typeof error === "string" ? error : error.message ?? "Unknown error";
  }
}
