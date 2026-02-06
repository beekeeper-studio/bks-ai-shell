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
import type { AvailableProviders } from "@/config";
import { disabledModelsByDefault, providerConfigs } from "@/config";
import { useChatStore } from "./chat";

type Model = {
  id: string;
  displayName: string;
};

type Configurable = {
  // ==== GENERAL ====
  /** Append custom instructions to the default system instructions. */
  customInstructions: string;
  /** Append custom instructions to the default system instructions.
   * It's applied based on the connection ID */
  customConnectionInstructions: {
    workspaceId: number;
    connectionId: number;
    instructions: string;
  }[];
  allowExecutionOfReadOnlyQueries: boolean;
  enableAutoCompact: boolean;

  // ==== MODELS ====
  /** List of disabled models by id. */
  disabledModels: { providerId: AvailableProviders; modelId: string }[];
  /** Models that are removed are not shown in the UI and cannot be enabled. */
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

export type ConfigurationKey = keyof ConfigurationState;

const encryptedConfigKeys: (keyof EncryptedConfigurable)[] = [
  "providers.openai.apiKey",
  "providers.anthropic.apiKey",
  "providers.google.apiKey",
  "providers_openaiCompat_apiKey",
];

const defaultConfiguration: ConfigurationState = {
  // ==== GENERAL ====
  customInstructions: "",
  customConnectionInstructions: [],
  allowExecutionOfReadOnlyQueries: false,
  enableAutoCompact: true,

  // ==== MODELS ====
  "providers.openai.apiKey": "",
  "providers.anthropic.apiKey": "",
  "providers.google.apiKey": "",
  providers_openaiCompat_baseUrl: "",
  providers_openaiCompat_apiKey: "",
  providers_openaiCompat_headers: "",
  providers_ollama_baseUrl: "http://localhost:11434",
  providers_ollama_headers: "",
  providers_openai_models: [],
  providers_anthropic_models: [],
  providers_google_models: [],
  providers_openaiCompat_models: [],
  providers_ollama_models: [],
  providers_mock_models: [],
  disabledModels: disabledModelsByDefault,
  removedModels: [],
};

function isEncryptedConfig(
  config: string,
): config is keyof EncryptedConfigurable {
  return encryptedConfigKeys.includes(config as keyof EncryptedConfigurable);
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

    /** Models that are not defined in the config. */
    models(state): (Model & { providerId: AvailableProviders })[] {
      const availableProviders = Object.keys(
        providerConfigs,
      ) as AvailableProviders[];
      return availableProviders.flatMap((providerId) => {
        const models = state[`providers_${providerId}_models`];
        if (!models) {
          return [];
        }
        // Filter out removed models
        return models
          .filter(
            (model) =>
              !state.removedModels.some(
                (m) => m.modelId === model.id && m.providerId === providerId,
              ),
          )
          .map((model) => ({ ...model, providerId }));
      });
    },

    currentConnectionInstructions(state): string {
      const connection = useChatStore().connectionInfo;
      const connectionInstructions = state.customConnectionInstructions.find(
        (i) =>
          i.connectionId === connection.id &&
          i.workspaceId === connection.workspaceId,
      );
      return connectionInstructions?.instructions || "";
    },
  },

  actions: {
    async sync() {
      const configuration: Record<string, unknown> = {};
      for (const key in defaultConfiguration) {
        const value = isEncryptedConfig(key)
          ? await getEncryptedData(key)
          : await getData(key);

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
      if (
        this.disabledModels.find(
          (m) => m.providerId === providerId && m.modelId === modelId,
        )
      ) {
        return;
      }
      // clone this to avoid sending Proxy objects to the host
      const disabledModels = _.cloneDeep(this.disabledModels);
      disabledModels.push({ providerId, modelId });
      await this.configure("disabledModels", disabledModels);
    },

    async disableModels(
      models: { providerId: AvailableProviders; modelId: string }[],
    ) {
      const map = new Map<string, (typeof models)[number]>();

      for (const model of this.disabledModels) {
        // clone this to avoid sending Proxy objects to the host
        map.set(`${model.providerId}:${model.modelId}`, _.clone(model));
      }

      for (const model of models) {
        // clone this to avoid sending Proxy objects to the host
        map.set(`${model.providerId}:${model.modelId}`, _.clone(model));
      }

      await this.configure("disabledModels", [...map.values()]);
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

    async configureCustomConnectionInstructions(instructions: string) {
      const connection = useChatStore().connectionInfo;
      const connectionId = connection.id;
      const workspaceId = connection.workspaceId;
      const connectionInstructions = _.cloneDeep(this.customConnectionInstructions);
      const idx = connectionInstructions.findIndex(
        (i) => i.connectionId === connectionId && i.workspaceId === workspaceId,
      );
      if (idx === -1) {
        connectionInstructions.push({
          connectionId,
          workspaceId,
          instructions,
        });
      } else {
        connectionInstructions[idx] = {
          connectionId,
          workspaceId,
          instructions,
        };
      }
      await this.configure(
        "customConnectionInstructions",
        connectionInstructions,
      );
    },
  },
});
