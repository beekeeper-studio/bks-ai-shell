import { BaseProvider } from "@/providers/BaseProvider";
import { createOllama } from "ollama-ai-provider";

export class OllamaProvider extends BaseProvider {
  constructor(
    private options: {
      baseURL: string;
      headers: Record<string, string>;
    },
  ) {
    super();
  }

  getModel(id: string) {
    return createOllama({
      baseURL: this.options.baseURL,
      headers: this.options.headers,
    }).languageModel(id, {
      simulateStreaming: true,
    });
  }

  async listModels() {
    const url = new URL("api/tags", this.options.baseURL);
    const res = await fetch(url.toString(), {
      headers: this.options.headers,
    });
    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.statusText}`);
    }
    const data = await res.json();
    try {
      const models = data.models.map((m: any) => ({
        id: m.name,
        displayName: m.name,
      }));
      return models;
    } catch (e) {
      throw new Error(`Failed to list models: ${e}`);
    }
  }
}
