import type { AvailableProviders } from "@/config";
import { AnthropicProvider } from "@/providers/AnthropicProvider";
import { DeepSeekProvider } from "@/providers/DeepSeekProvider";
import { OpenAIProvider } from "@/providers/OpenAIProvider";
import { OpenAICompatibleProvider } from "@/providers/OpenAICompatibleProvider";
import { GoogleProvider } from "@/providers/GoogleProvider";
import { ZaiProvider } from "@/providers/ZaiProvider";
import {
  useEncryptedSettingsStore,
  useSettingsStore,
} from "@/stores/settings";
import { OllamaProvider } from "./OllamaProvider";
import { MockProvider } from "@/providers/MockProvider";
import { parseHeaders } from "@/utils";
import _ from "lodash";

export function createProvider(id: AvailableProviders)  {
  const settings = useSettingsStore();
  const encryptedSettings = useEncryptedSettingsStore();
  switch (id) {
    case "anthropic":
      return new AnthropicProvider({
        apiKey: encryptedSettings["providers.anthropic.apiKey"],
      });
    case "openai":
      return new OpenAIProvider({
        apiKey: encryptedSettings["providers.openai.apiKey"],
      });
    case "google":
      return new GoogleProvider({
        apiKey: encryptedSettings["providers.google.apiKey"],
      });
    case "zai":
      return new ZaiProvider({
        apiKey: encryptedSettings["providers.zai.apiKey"],
      });
    case "deepseek":
      return new DeepSeekProvider({
        apiKey: encryptedSettings["providers.deepseek.apiKey"],
      });
    case "openaiCompat":
      if (_.isEmpty(settings.providers_openaiCompat_baseUrl)) {
        throw new Error("Missing API base URL [2]");
      }
      return new OpenAICompatibleProvider({
        baseURL: settings.providers_openaiCompat_baseUrl,
        apiKey: encryptedSettings.providers_openaiCompat_apiKey,
        headers: parseHeaders(settings.providers_openaiCompat_headers),
      });
    case "ollama":
      if (_.isEmpty(settings.providers_ollama_baseUrl)) {
        throw new Error("Missing API base URL [2]");
      }
      return new OllamaProvider({
        baseURL: settings.providers_ollama_baseUrl,
        headers: parseHeaders(settings.providers_ollama_headers),
      });
    case "mock":
      if (import.meta.env.MODE !== "development") {
        throw new Error("Mock provider is only available in development mode");
      }
      return new MockProvider();
    default:
      throw new Error(`Provider ${id} does not exist.`);
  }
}
