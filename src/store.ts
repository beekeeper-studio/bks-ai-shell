import { defineStore } from "pinia";
import { getDefaultInstructions, STORAGE_KEYS } from "./config";
import { IModel } from "./types";
import _ from "lodash";
import { createProvider, ProviderId } from "./providers/modelFactory";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { BaseModelProvider, BaseProvider } from "./providers/BaseModelProvider";
import { request } from "@beekeeperstudio/plugin";

interface Tool {
  id: string;
  name: string;
  displayName: string;
  args: any;
  asksPermission: boolean;
  permissionResponse?: "accept" | "reject";
  permissionResolved: boolean;
}

interface ProviderState {
  providerId: ProviderId;
  apiKey: string;
  provider?: BaseProvider;
  model?: BaseModelProvider;
  models: IModel[];
  messages: BaseMessage[];
  isThinking: boolean;
  isCallingTool: boolean;
  activeTool: Tool | null;
  activeToolId: string | null;
  tools: Record<string, Tool>;
  error: unknown;
  conversationTitleIsSet: boolean;
}

// the first argument is a unique id of the store across your application
export const useProviderStore = defineStore("providers", {
  state: (): ProviderState => ({
    providerId:
      (localStorage.getItem(STORAGE_KEYS.PROVIDER) as ProviderId) || "claude",
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
    provider: undefined,
    models: [],
    messages: [],
    isThinking: false,
    isCallingTool: false,
    activeTool: null,
    activeToolId: null,
    tools: {},
    error: null,
    conversationTitleIsSet: false,
  }),
  actions: {
    async initializeProvider() {
      this.provider = await createProvider(this.providerId, this.apiKey);
      this.models = this.provider.models;
      let modelId = this.models[0].id;
      const storedModelId = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (storedModelId && storedModelId.startsWith(`${this.providerId}:`)) {
        modelId = storedModelId.split(":")[1];
      }
      this.setModel(modelId);
      if (this.messages.length === 0) {
        this.messages.push(new SystemMessage(await getDefaultInstructions()));
      }
    },
    sendStreamMessage(message: string): Promise<void> {
      if (!this.provider) {
        throw new Error("No provider initialized");
      }

      this.isThinking = true;

      this.messages.push(new HumanMessage(message));

      let aiMessageIndex = -1;

      return new Promise<void>((resolve, reject) => {
        this.model!.sendStreamMessage(message, this.messages.slice(0, -1), {
          onStart: async () => {
            aiMessageIndex = -1;
          },
          onStreamChunk: async (message) => {
            if (aiMessageIndex === -1) {
              this.messages.push(message);
              aiMessageIndex = this.messages.length - 1;
            } else {
              this.messages[aiMessageIndex] = message;
            }

            this.messages = [...this.messages];
          },
          onBeforeToolCall: async (id, name, args) => {
            this.activeToolId = id;
            this.activeTool = {
              id,
              name,
              displayName: name.split("_").map(_.capitalize).join(" "),
              args,
              asksPermission: false,
              permissionResolved: false,
            };
          },
          onRequestToolPermission: async () => {
            this.activeTool!.asksPermission = true;
            this.isThinking = false;
            const permissionResponse = await new Promise<"accept" | "reject">(
              (resolve) => {
                const unsubscribe = this.$subscribe((_mutation, state) => {
                  if (state.activeTool?.permissionResponse) {
                    unsubscribe();
                    resolve(state.activeTool.permissionResponse);
                  }
                });
              },
            );
            this.activeTool!.permissionResponse = permissionResponse;
            this.activeTool!.permissionResolved = true;
            return permissionResponse === "accept";
          },
          onToolMessage: async (message) => {
            this.messages.push(message);
            this.tools[message.tool_call_id] = this.activeTool!;
            this.activeToolId = null;
            this.activeTool = null;
            this.isThinking = true;
          },
          onFinalized: async (messages) => {
            this.isThinking = false;
            this.messages = messages;
            if (!this.conversationTitleIsSet) {
              const title = await this.model!.generateConversationTitle(this.messages);
              request("setTabTitle", { title });
              this.conversationTitleIsSet = true;
            }
            resolve();
          },
          onError: (error) => {
            this.isThinking = false;
            this.isCallingTool = false;
            if (
              error instanceof Error &&
              (error.message.startsWith("Aborted") ||
                error.message.startsWith("AbortError"))
            ) {
              resolve();
            } else {
              console.error(error);
              this.error = error;
              reject(error);
            }
          },
        });
      });
    },
    stopStreamMessage(): void {
      if (!this.model) {
        throw new Error("No model created");
      }

      this.model.abortStreamMessage();
    },
    setProviderId(providerId: ProviderId) {
      this.providerId = providerId;
      localStorage.setItem(STORAGE_KEYS.PROVIDER, providerId);
    },
    setApiKey(apiKey: string) {
      this.apiKey = apiKey;
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    },
    setModel(modelId: string) {
      if (this.model?.isSendingMessage) {
        throw new Error("Cannot switch model while a message is being sent.");
      }

      try {
        this.model = this.provider?.createModel({ modelId });
        localStorage.setItem(
          STORAGE_KEYS.MODEL,
          `${this.providerId}:${modelId}`,
        );
        console.log(`Switched to model: ${modelId}`);
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
  },
});
