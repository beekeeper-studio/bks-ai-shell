import { defineStore } from "pinia";
import { ProviderId } from "./providers";
import { STORAGE_KEYS } from "./config";
import { BaseModelProvider } from "./providers/baseProvider";
import { IChatMessage, IModel } from "./types";
import _ from "lodash";
import { createModelProvider } from "./providers/modelFactory";

interface ProviderState {
  providerId: ProviderId;
  apiKey: string;
  provider?: BaseModelProvider;
  model?: IModel;
  models: IModel[];
  messages: IChatMessage[];
  isThinking: boolean;
}

// the first argument is a unique id of the store across your application
export const useProviderStore = defineStore("providers", {
  state: (): ProviderState => ({
    providerId:
      (localStorage.getItem(STORAGE_KEYS.PROVIDER) as ProviderId) || "claude",
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
    provider: undefined,
    model: undefined,
    models: [],
    messages: [],
    isThinking: false,
  }),
  actions: {
    async initializeProvider() {
      this.isThinking = true;

      try {
        const provider = await createModelProvider(
          this.providerId,
          this.apiKey,
        );
        await provider.initialize();
        const models = await provider.getAvailableModels();
        this.model = provider.getModel();
        this.models = models;
        this.provider = provider;
        if (this.messages.length === 0) {
          this.messages.push({
            type: "system",
            content:
              "Hi there! I'm your AI-powered assistant. How can I help you today?",
          });
        }
      } catch (e) {
        console.error(e);
        this.messages.push({
          type: "system",
          content: `Something went wrong: ${e}`,
        });
        throw e;
      } finally {
        this.isThinking = false;
      }
    },
    async sendMessage(message: string) {
      if (!this.provider) {
        throw new Error("No provider initialized");
      }

      this.isThinking = true;

      try {
        this.messages.push({ type: "human", content: message });
        const response = await this.provider.sendMessage(
          message,
          this.messages,
        );
        this.messages.push({ type: "ai", content: response });
      } catch (e) {
        console.error(e);
        this.messages.push({
          type: "system",
          content: `Something went wrong: ${e}`,
        });
        throw e;
      } finally {
        this.isThinking = false;
      }
    },
    sendStreamMessage(message: string): Promise<void> {
      if (!this.provider) {
        throw new Error("No provider initialized");
      }

      this.isThinking = true;

      this.messages.push({ type: "human", content: message });
      const responseMessage: IChatMessage = { type: "ai", content: "" };
      this.messages.push(responseMessage);
      return new Promise<void>((resolve, reject) => {
        this.provider!.sendStreamMessage(message, this.messages, {
          onChunk: async (text) => {
            responseMessage.content += text;
            this.messages = [...this.messages];
          },
          onTool: async (tool) => {
            console.log('using tool:', tool)
            // tell the user that a tool is being used
          },
          onEnd: () => resolve(),
        })
          .catch((e) => {
            console.error(e);
            this.messages.push({
              type: "system",
              content: `Something went wrong: ${e}`,
            });
            reject(e);
          })
          .finally(() => {
            this.isThinking = false;
          });
      });
    },
    setProviderId(providerId: ProviderId) {
      this.providerId = providerId;
      localStorage.setItem(STORAGE_KEYS.PROVIDER, providerId);
    },
    setApiKey(apiKey: string) {
      this.apiKey = apiKey;
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    },
    async switchModelById(modelId: string) {
      try {
        await this.provider?.switchModelById(modelId);
        this.model = this.provider?.getModel();
        this.messages.push({
          type: "system",
          content: `Switched to ${this.model?.displayName}`,
        });
      } catch (e) {
        console.error(e);
        this.messages.push({
          type: "system",
          content: `Something went wrong: ${e}`,
        });
        throw e;
      }
    },
  },
});
