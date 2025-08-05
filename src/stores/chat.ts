import { defineStore } from "pinia";
import {
  AvailableModels,
  AvailableProviders,
  AvailableProvidersWithDynamicModels,
  providerConfigs,
} from "@/config";
import { useConfigurationStore } from "./configuration";
import { useInternalDataStore } from "./internalData";
import { useTabState } from "./tabState";
import { createProvider } from "@/providers";
import _ from "lodash";
import { ProviderSyncError } from "@/utils/ProviderSyncError";

export type Model<T extends AvailableProviders = AvailableProviders> = (
  | AvailableModels<T>
  | { id: string; displayName: string }
) & {
  provider: T;
  providerDisplayName: (typeof providerConfigs)[T]["displayName"];
  enabled: boolean;
  removable: boolean;
};

type ChatState = {
  /** The active model. E.g. Claude 4 Sonnet, Claude 3.5, etc. */
  model?: Model;
  errors: ProviderSyncError[];
};

// the first argument is a unique id of the store across your application
export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    model: undefined,
    errors: [],
  }),
  getters: {
    models() {
      const config = useConfigurationStore();
      const models: Model[] = [];
      if (config["providers.openai.apiKey"]) {
        models.push(
          ...providerConfigs.openai.models.map((m) => ({
            ...m,
            provider: "openai" as const,
            providerDisplayName: providerConfigs.openai.displayName,
            enabled: !config.disabledModels.some(
              (disabled) =>
                m.id === disabled.modelId && disabled.providerId === "openai",
            ),
            removable: false,
          })),
        );
      }
      if (config["providers.anthropic.apiKey"]) {
        models.push(
          ...providerConfigs.anthropic.models.map((m) => ({
            ...m,
            provider: "anthropic" as const,
            providerDisplayName: providerConfigs.anthropic.displayName,
            enabled: !config.disabledModels.some(
              (disabled) =>
                m.id === disabled.modelId &&
                disabled.providerId === "anthropic",
            ),
            removable: false,
          })),
        );
      }
      if (config["providers.google.apiKey"]) {
        models.push(
          ...providerConfigs.google.models.map((m) => ({
            ...m,
            provider: "google" as const,
            providerDisplayName: providerConfigs.google.displayName,
            enabled: !config.disabledModels.some(
              (disabled) =>
                m.id === disabled.modelId && disabled.providerId === "google",
            ),
            removable: false,
          })),
        );
      }
      models.push(
        ...config.models.map((m) => ({
          ...m,
          provider: m.providerId,
          providerDisplayName: providerConfigs[m.providerId].displayName,
          enabled: !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === m.providerId,
          ),
          removable: false,
        })),
      );
      return models;
    },
  },
  actions: {
    async initialize() {
      const internal = useInternalDataStore();
      const config = useConfigurationStore();
      const tabState = useTabState();
      await config.sync();
      await internal.sync();
      await tabState.sync();

      this.model =
        this.models.find((m) => m.id === internal.lastUsedModelId) ||
        this.models[0];

      this.syncProvider("openaiCompat");
      this.syncProvider("ollama");
    },
    /** List the models for a provider and store them in the internal data store. */
    async syncProvider(provider: AvailableProvidersWithDynamicModels) {
      const config = useConfigurationStore();
      try {
        const errorIdx = this.errors.findIndex(
          (e) => e.providerId === provider,
        );
        if (errorIdx !== -1) {
          this.errors.splice(errorIdx, 1);
        }
        const models = await createProvider(provider).listModels();
        config.setModels(provider, models);
      } catch (e) {
        if (e.message !== "Missing API base URL") {
          console.error(e);
          this.errors.push(
            new ProviderSyncError(e.message, {
              providerId: provider,
              cause: e,
            }),
          );
        }
        config.setModels(provider, []);
      }
    },
    /* Compare two models */
    matchModel(a: Model, b: Model) {
      return a.id === b.id && a.provider === b.provider;
    },
  },
});
