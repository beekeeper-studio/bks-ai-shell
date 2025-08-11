import { AvailableProviders } from "@/config";
import { AnthropicProvider } from "@/providers/AnthropicProvider";
import { OpenAIProvider } from "@/providers/OpenAIProvider";
import { OpenAICompatibleProvider } from "@/providers/OpenAICompatibleProvider";
import { GoogleProvider } from "@/providers/GoogleProvider";
import { useConfigurationStore } from "@/stores/configuration";
import { OllamaProvider } from "./OllamaProvider";
import { parseHeaders } from "@/utils";
import _ from "lodash";

export function createProvider(id: AvailableProviders) {
  const configuration = useConfigurationStore();
  switch (id) {
    case "anthropic":
      return new AnthropicProvider({
        apiKey: configuration["providers.anthropic.apiKey"],
      });
    case "openai":
      return new OpenAIProvider({
        apiKey: configuration["providers.openai.apiKey"],
      });
    case "google":
      return new GoogleProvider({
        apiKey: configuration["providers.google.apiKey"],
      });
    case "openaiCompat":
      if (_.isEmpty(configuration.providers_openaiCompat_baseUrl)) {
        throw new Error("Missing API base URL");
      }
      return new OpenAICompatibleProvider({
        baseURL: configuration.providers_openaiCompat_baseUrl,
        apiKey: configuration.providers_openaiCompat_apiKey,
        headers: parseHeaders(configuration.providers_openaiCompat_headers),
      });
    case "ollama":
      if (_.isEmpty(configuration.providers_ollama_baseUrl)) {
        throw new Error("Missing API base URL");
      }
      return new OllamaProvider({
        baseURL: configuration.providers_ollama_baseUrl,
        headers: parseHeaders(configuration.providers_ollama_headers),
      });
    default:
      throw new Error(`Provider ${id} does not exist.`);
  }
}
