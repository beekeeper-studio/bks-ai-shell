import type { AvailableProviders } from "@/config";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export class OllamaProvider extends OpenAICompatibleProvider {
  constructor(
    options: {
      baseURL: string;
      headers: Record<string, string>;
    },
  ) {
    super({
      ...options,
      apiKey: "fake-key",
      baseURL: new URL(options.baseURL).toString() + "v1/",
      name: "ollama",
    });
  }

  get providerId(): AvailableProviders {
    return "ollama";
  }
}
