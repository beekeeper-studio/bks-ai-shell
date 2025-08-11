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
  /** Available if the api key is set. */
  available: boolean;
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
      const openaiModels = providerConfigs.openai.models.map((m) => ({
        ...m,
        provider: "openai" as const,
        providerDisplayName: providerConfigs.openai.displayName,
        available: !!config["providers.openai.apiKey"],
        enabled:
          !!config["providers.openai.apiKey"] &&
          !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === "openai",
          ),
        removable: false,
      }));
      const anthropicModels = providerConfigs.anthropic.models.map((m) => ({
        ...m,
        provider: "anthropic" as const,
        providerDisplayName: providerConfigs.anthropic.displayName,
        available: !!config["providers.anthropic.apiKey"],
        enabled:
          !!config["providers.anthropic.apiKey"] &&
          !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === "anthropic",
          ),
        removable: false,
      }));
      const googleModels = providerConfigs.google.models.map((m) => ({
        ...m,
        provider: "google" as const,
        providerDisplayName: providerConfigs.google.displayName,
        available: !!config["providers.google.apiKey"],
        enabled:
          !!config["providers.google.apiKey"] &&
          !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === "google",
          ),
        removable: false,
      }));
      const userDefinedModels = config.models.map((m) => ({
        ...m,
        provider: m.providerId,
        providerDisplayName: providerConfigs[m.providerId].displayName,
        available: true,
        enabled: !config.disabledModels.some(
          (disabled) =>
            m.id === disabled.modelId && disabled.providerId === m.providerId,
        ),
        removable: false,
      }));

      return [
        ...openaiModels,
        ...anthropicModels,
        ...googleModels,
        ...userDefinedModels,
      ];
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
        this.models.find(
          (m) => m.id === internal.lastUsedModelId && m.enabled,
        ) || this.models.find((m) => m.enabled);

      internal.lastUsedModelId = this.model?.id;

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
  },
});
