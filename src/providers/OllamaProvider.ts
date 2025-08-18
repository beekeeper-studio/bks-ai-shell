import { BaseProvider } from "@/providers/BaseProvider";
import {
  createOllama,
  OllamaProvider as AIOllamaProvider,
} from "ollama-ai-provider-v2";
import { z } from "zod/v4";

type OllamaProviderOptions = {
  ollama: z.input<Exclude<Parameters<AIOllamaProvider["chat"]>[1], undefined>>;
};

export class OllamaProvider extends BaseProvider {
  constructor(
    private options: {
      baseURL: string;
      headers: Record<string, string>;
    },
  ) {
    super();
    this.options = {
      ...options,
      baseURL: new URL(options.baseURL).toString() + "api/",
    };
  }

  getModel(id: string) {
    return createOllama({
      baseURL: this.options.baseURL,
      headers: this.options.headers,
    }).languageModel(id);
  }

  getProviderOptions(): OllamaProviderOptions {
    return {
      ollama: {
        think: false,
      },
    };
  }

  async listModels() {
    const res = await fetch(`${this.options.baseURL}tags/`, {
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
