import { BaseProvider } from "@/providers/BaseProvider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(
    protected options: {
      baseURL: string;
      headers: Record<string, string>;
      apiKey: string;
      name?: string;
    },
  ) {
    super();
  }

  getModel(id: string) {
    return createOpenAICompatible({
      name: "OpenAI Compatible (AI Shell)",
      baseURL: this.options.baseURL,
      apiKey: this.options.apiKey,
      headers: this.options.headers,
    }).languageModel(id);
  }

  async listModels() {
    const url = new URL("./models", this.options.baseURL);

    const res = await fetch(url.toString(), {
      headers: this.options.headers,
    });
    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(`Failed to list models: ${data.error}`);
    }
    try {
      const models = data.data?.map((m: any) => ({
        id: m.id,
        displayName: m.id,
      })) || [];
      return models;
    } catch (e) {
      throw new Error(`Failed to list models: ${e}`);
    }
  }
}
