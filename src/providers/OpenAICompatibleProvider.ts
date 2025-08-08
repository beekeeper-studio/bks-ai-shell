import { BaseProvider } from "@/providers/BaseProvider";
import { createOpenAI } from "@ai-sdk/openai";

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(
    private options: {
      baseURL: string;
      headers: Record<string, string>;
      apiKey: string;
    },
  ) {
    super();
  }

  getModel(id: string) {
    return createOpenAI({
      compatibility: "compatible",
      baseURL: this.options.baseURL,
      apiKey: this.options.apiKey,
      headers: this.options.headers,
    }).languageModel(id);
  }

  async listModels() {
    const url = new URL("v1/models", this.options.baseURL);
        console.log(url.toString())

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
      const models = data.data.map((m: any) => ({
        id: m.id,
        displayName: m.id,
      }));
      return models;
    } catch (e) {
      throw new Error(`Failed to list models: ${e}`);
    }
  }
}
