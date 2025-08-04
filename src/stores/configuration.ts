/** Usage:
 *
 * 1. Call `sync()` if it hasn't been called yet.
 * 2. Read the state by accessing it normally.
 * 3. Use `configure()` to update the state.
 *
 * FUTURE PLAN (probably):
 *
 * - Save configuration to .ini config files via Beekeeper Studio API
 *   instead of using setData?
 */
import { defineStore } from "pinia";
import _ from "lodash";
import {
  getData,
  getEncryptedData,
  setData,
  setEncryptedData,
} from "@beekeeperstudio/plugin";
import { AvailableModels, disabledModelsByDefault } from "@/config";

type Configurable = {
  /** Enable summarization. */
  summarization: boolean;
  /** List of disabled models by id. */
  disabledModels: AvailableModels["id"][];
  "providers_openaiCompat_url": string;
  "providers_openaiCompat_headers": { key: string; value: string }[];
  "providers_ollama_url": string;
  "providers_ollama_headers": { key: string; value: string }[];
};

type EncryptedConfigurable = {
  "providers.openai.apiKey": string;
  "providers.anthropic.apiKey": string;
  "providers.google.apiKey": string;
};

type ConfigurationState = Configurable & EncryptedConfigurable;

const encryptedConfigKeys: (keyof EncryptedConfigurable)[] = [
  "providers.openai.apiKey",
  "providers.anthropic.apiKey",
  "providers.google.apiKey",
];

const defaultConfiguration: ConfigurationState = {
  summarization: true,
  "providers.openai.apiKey": "",
  "providers.anthropic.apiKey": "",
  "providers.google.apiKey": "",
  "providers_openaiCompat_url": "",
  "providers_openaiCompat_headers": [{ key: "", value: "" }],
  "providers_ollama_url": "http://localhost:11434",
  "providers_ollama_headers": [{ key: "", value: "" }],
  disabledModels: disabledModelsByDefault,
};

function isEncryptedConfig(
  config: string,
): config is keyof EncryptedConfigurable {
  return encryptedConfigKeys.includes(config);
}

export const useConfigurationStore = defineStore("configuration", {
  state: (): ConfigurationState => {
    return defaultConfiguration;
  },

  getters: {
    apiKeyExists(): boolean {
      return encryptedConfigKeys.some((key) => this[key].trim() !== "");
    },
  },

  actions: {
    async sync() {
      const configuration: Partial<Configurable> = {};
      for (const key in defaultConfiguration) {
        const value = isEncryptedConfig(key)
          ? await getEncryptedData<Configurable>(key)
          : await getData<Configurable>(key);

        if (value === null) {
          continue;
        }

        configuration[key] = value;
      }

      this.$patch(configuration);
    },
    async configure<T extends keyof ConfigurationState>(
      config: T,
      value: ConfigurationState[T],
    ) {
      this.$patch({ [config]: value });

      if (isEncryptedConfig(config)) {
        await setEncryptedData(config, value);
      } else {
        await setData(config, value);
      }
    },
  },
});
