import _ from "lodash";
import type { AvailableProviders } from "@/config";
import { disabledModelsByDefault, providerConfigs } from "@/config";
import { defineStore } from "pinia";

type Model = {
  id: string;
  displayName: string;
};

type ModelRef = {
  providerId: AvailableProviders;
  modelId: string;
};

export const useSettingsStore = defineStore("settings", {
  persist: true,
  state() {
    return {
      // ==== GENERAL ====
      /** Append custom instructions to the default system instructions. */
      customInstructions: "",
      allowExecutionOfReadOnlyQueries: false,
      enableAutoCompact: true,

      // ==== MODELS ====
      /** List of disabled models by id. */
      disabledModels: _.cloneDeep(disabledModelsByDefault) as ModelRef[],
      /** Models that are removed are not shown in the UI and cannot be enabled. */
      removedModels: [] as ModelRef[],
      providers_openaiCompat_baseUrl: "",
      providers_openaiCompat_headers: "",
      providers_ollama_baseUrl: "http://localhost:11434",
      providers_ollama_headers: "",

      // User defined models
      providers_anthropic_models: [] as Model[],
      providers_google_models: [] as Model[],
      providers_zai_models: [] as Model[],
      providers_openai_models: [] as Model[],
      providers_deepseek_models: [] as Model[],
      providers_openaiCompat_models: [] as Model[],
      providers_ollama_models: [] as Model[],
      providers_mock_models: [] as Model[],
    };
  },

  getters: {
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
  },

  actions: {
    setModels(providerId: AvailableProviders, models: Model[]) {
      this[`providers_${providerId}_models`] = models;
    },

    addModel(options: {
      providerId: AvailableProviders;
      modelId: string;
      displayName: string;
    }) {
      const models = _.cloneDeep(this.getModelsByProvider(options.providerId));
      models.push({ id: options.modelId, displayName: options.displayName });
      this.setModels(options.providerId, models);
    },

    removeModel(providerId: AvailableProviders, modelId: string) {
      const removedModels = _.cloneDeep(this.removedModels);
      removedModels.push({ providerId, modelId });
      this.removedModels = removedModels;
    },

    disableModel(providerId: AvailableProviders, modelId: string) {
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
      this.disabledModels = disabledModels;
    },

    disableModels(
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

      this.disabledModels = [...map.values()];
    },

    enableModel(providerId: AvailableProviders, modelId: string) {
      const disabledModels = _.cloneDeep(this.disabledModels);
      const idx = disabledModels.findIndex(
        (m) => m.providerId === providerId && m.modelId === modelId,
      );
      if (idx !== -1) {
        disabledModels.splice(idx, 1);
      }
      this.disabledModels = disabledModels;
    },
  },
});
