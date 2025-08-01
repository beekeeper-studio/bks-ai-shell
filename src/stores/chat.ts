import { defineStore } from "pinia";
import { AvailableModels, AvailableProviders, providerConfigs } from "@/config";
import { useConfigurationStore } from "./configuration";
import { useInternalDataStore } from "./internalData";
import { useTabState } from "./tabState";

export type Model<T extends AvailableProviders = AvailableProviders> =
  AvailableModels<T> & { provider: T };

type ChatState = {
  /** The active provider. E.g. Anthropic, OpenAI */
  provider?: string;

  /** The active model. E.g. Claude 4 Sonnet, Claude 3.5, etc. */
  model?: Model;

  /** The title of the conversation. */
  conversationTitle: string;

  /** The model is generating a title for the conversation. */
  isGeneratingConversationTitle: boolean;
};

// the first argument is a unique id of the store across your application
export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    conversationTitle: "",
    isGeneratingConversationTitle: false,
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
          })),
        );
      }
      if (config["providers.anthropic.apiKey"]) {
        models.push(
          ...providerConfigs.anthropic.models.map((m) => ({
            ...m,
            provider: "anthropic" as const,
          })),
        );
      }
      if (config["providers.google.apiKey"]) {
        models.push(
          ...providerConfigs.google.models.map((m) => ({
            ...m,
            provider: "google" as const,
          })),
        );
      }
      return models.filter((model) =>
        !config.disabledModels.some((disabled) => model.id === disabled),
      );
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
        this.models.find((m) => m.id === internal.lastUsedModelId) || this.models[0];
    },
  },
});
