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
import {
  AvailableProviders,
  disabledModelsByDefault,
  providerConfigs,
} from "@/config";

type Model = {
  id: string;
  displayName: string;
};

type Configurable = {
  /** Enable summarization. */
  summarization: boolean;
  /** List of disabled models by id. */
  disabledModels: { providerId: AvailableProviders; modelId: string }[];
  removedModels: { providerId: AvailableProviders; modelId: string }[];
  providers_openaiCompat_baseUrl: string;
  providers_openaiCompat_headers: string;
  providers_ollama_baseUrl: string;
  providers_ollama_headers: string;
} & {
  // User defined models
  [K in AvailableProviders as `providers_${K}_models`]: Model[];
};

type EncryptedConfigurable = {
  "providers.openai.apiKey": string;
  "providers.anthropic.apiKey": string;
  "providers.google.apiKey": string;
  providers_openaiCompat_apiKey: string;
};

type ConfigurationState = Configurable & EncryptedConfigurable;

const encryptedConfigKeys: (keyof EncryptedConfigurable)[] = [
  "providers.openai.apiKey",
  "providers.anthropic.apiKey",
  "providers.google.apiKey",
  "providers_openaiCompat_apiKey",
];

const defaultConfiguration: ConfigurationState = {
  summarization: true,
  "providers.openai.apiKey": "",
  "providers.anthropic.apiKey": "",
  "providers.google.apiKey": "",
  providers_openaiCompat_baseUrl: "",
  providers_openaiCompat_apiKey: "",
  providers_openaiCompat_headers: "",
  providers_ollama_baseUrl: "http://localhost:11434/api",
  providers_ollama_headers: "",
  providers_openai_models: [],
  providers_anthropic_models: [],
  providers_google_models: [],
  providers_openaiCompat_models: [],
  providers_ollama_models: [],
  disabledModels: disabledModelsByDefault,
  removedModels: [],
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

    getModelsByProvider: (state) => {
      return (provider: AvailableProviders) => {
        return state[`providers_${provider}_models`];
      };
    },

    models(state): (Model & { providerId: AvailableProviders })[] {
      const availableProviders = Object.keys(
        providerConfigs,
      ) as AvailableProviders[];
      return availableProviders.flatMap((providerId) => {
        return (
          state[`providers_${providerId}_models`]
            // Filter out removed models
            .filter(
              (model) =>
                !state.removedModels.some(
                  (m) => m.modelId === model.id && m.providerId === providerId,
                ),
            )
            .map((model) => ({ ...model, providerId }))
        );
      });
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

    async setModels(providerId: AvailableProviders, models: Model[]) {
      await this.configure(`providers_${providerId}_models`, models);
    },

    async addModel(options: {
      providerId: AvailableProviders;
      modelId: string;
      displayName: string;
    }) {
      const models = _.cloneDeep(this.getModelsByProvider(options.providerId));
      models.push({ id: options.modelId, displayName: options.displayName });
      await this.setModels(options.providerId, models);
    },

    async removeModel(providerId: AvailableProviders, modelId: string) {
      const removedModels = _.cloneDeep(this.removedModels);
      removedModels.push({ providerId, modelId });
      await this.configure("removedModels", removedModels);
    },

    async disableModel(providerId: AvailableProviders, modelId: string) {
      const disabledModels = _.cloneDeep(this.disabledModels);
      disabledModels.push({ providerId, modelId });
      await this.configure("disabledModels", disabledModels);
    },

    async enableModel(providerId: AvailableProviders, modelId: string) {
      const disabledModels = _.cloneDeep(this.disabledModels);
      const idx = disabledModels.findIndex(
        (m) => m.providerId === providerId && m.modelId === modelId,
      );
      if (idx !== -1) {
        disabledModels.splice(idx, 1);
      }
      await this.configure("disabledModels", disabledModels);
    },
  },
});
