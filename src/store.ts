import { defineStore } from "pinia";
import { STORAGE_KEYS } from "./config";
import { IModel } from "./types";
import _ from "lodash";
import { ProviderId, Providers } from "./providers";
import {
  BaseMessage,
  HumanMessage,
  StoredMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  ToolMessage,
} from "@langchain/core/messages";
import { BaseModelProvider, BaseProvider } from "./providers/BaseModelProvider";
import { expandTableResult, getEncryptedData, getViewState, setEncryptedData, setTabTitle, setViewState } from "@beekeeperstudio/plugin";
import { isAbortError } from "./utils";

interface Tool {
  id: string;
  name: string;
  displayName: string;
  args: any;
  asksPermission: boolean;
  permissionResponse?: "accept" | "reject";
  permissionResolved: boolean;
}

interface ToolExtra {
  /** Defined if the model asks for permission to call this tool. */
  permission?: {
    response: "pending" | "accept" | "reject";
  };
}

interface ViewState {
  messages: StoredMessage[];
  conversationTitle: string;
}

interface ProviderState {
  providerId: ProviderId;
  apiKey: string;
  provider?: BaseProvider;
  model?: BaseModelProvider;
  models: IModel[];
  messages: BaseMessage[];
  tools: Record<string, Tool>;
  error: unknown;

  /** The title of the conversation. */
  conversationTitle: string;
  /** Queued messages to send to the model. */
  queuedMessages: string[];
  /** Any info that ToolMessage does not cover. */
  toolExtras: { [toolId: string]: ToolExtra };
  /** Is the model processing a message? */
  isProcessing: boolean;
  /** The model is waiting for user permission to call a tool. */
  isWaitingPermission: boolean;
  /** Useful when user switches models while a message is being sent. */
  pendingModelId?: string;
  /** Indicates that the stream is being aborted. Use `abortStream()` to abort. */
  isAborting: boolean;
  /** The model is generating a title for the conversation. */
  isGeneratingConversationTitle: boolean;
}

// the first argument is a unique id of the store across your application
export const useProviderStore = defineStore("providers", {
  state: (): ProviderState => ({
    providerId:"claude",
    apiKey: "",
    provider: undefined,
    models: [],
    messages: [],
    tools: {},
    error: null,
    conversationTitle: "",
    isProcessing: false,
    isWaitingPermission: false,
    toolExtras: {},
    queuedMessages: [],
    isAborting: false,
    isGeneratingConversationTitle: false,
  }),
  getters: {
    /** Can send a message when the model is not processing or while the model
     * is processing, it is waiting for user permission. */
    canSendMessage(): boolean {
      return !this.isProcessing || this.isWaitingPermission;
    },
  },
  actions: {
    async initializeChat() {
      const apiKey = await getEncryptedData("providers.anthropic.apiKey") as string;
      if (apiKey) {
        this.apiKey = apiKey;
      }
    },
    async initializeProvider() {
      const state = await getViewState<ViewState>();
      if (state?.messages) {
        try {
          this.messages = mapStoredMessagesToChatMessages(state.messages);
        } catch (e) {
          console.error(e);
          this.error = `Failed to load messages: ${e}`;
        }
      }
      this.conversationTitle = state?.conversationTitle || "";
      if (this.conversationTitle) {
        this.isGeneratingConversationTitle = true;
      }
      const providerClass = Providers[this.providerId];
      if (!providerClass) {
        throw new Error(`Unknown provider: ${this.providerId}`);
      }
      this.provider = new providerClass();
      await this.provider.initialize(this.apiKey);
      this.models = this.provider.models;
      let modelId = this.models[0].id;
      const storedModelId = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (storedModelId && storedModelId.startsWith(`${this.providerId}:`)) {
        modelId = storedModelId.split(":")[1];
      }
      this.setModel(modelId);
      this.switchModel();
    },
    /** Queue a message and send it immediately if it's possible. */
    queueMessage(message: string) {
      this.queuedMessages.push(message);

      // If the model is not processing, start a new stream
      if (!this.isProcessing) {
        this.stream();
        return;
      }

      // If the model is processing and waiting for permission to call a tool, reject.
      if (this.isProcessing && this.isWaitingPermission) {
        this.rejectAllPendingTools();
        return;
      }
    },
    /** Send queued messages to the model, and call `.stream()` recursively if there are more. Typically, you don't need to call this. Instead, call `queueMessage`. */
    async stream(): Promise<void> {
      if (!this.provider) {
        throw new Error("No provider initialized");
      }

      if (this.queuedMessages.length === 0) {
        throw new Error("No message to send");
      }

      let aiMessageIndex = -1;
      const message = this.queuedMessages.join("\n");

      this.messages.push(new HumanMessage(message));

      this.switchModel();

      this.queuedMessages = [];
      this.isProcessing = true;
      this.error = null;
      this.isAborting = false;

      const messages = await this.model!.sendStreamMessage(
        message,
        this.messages.slice(0, -1),
        {
          onCreatedStream: async () => {
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
          onBeforeToolCall: (toolMessage) => {
            this.toolExtras = {
              ...this.toolExtras,
              [toolMessage.tool_call_id]: {},
            };
          },
          onRequestToolPermission: async (toolMessage) => {
            this.isWaitingPermission = true;

            this.toolExtras[toolMessage.tool_call_id] = {
              ...this.toolExtras[toolMessage.tool_call_id],
              permission: {
                response: "pending",
              },
            };

            const accepted = await this.waitForPermission(toolMessage);

            this.isWaitingPermission = false;

            return accepted;
          },
          onToolMessage: (message, context) => {
            this.messages.push(message);

            if (context.name === "run_query" && context.status === "success") {
              if (localStorage.getItem(STORAGE_KEYS.HAS_OPENED_TABLE_RESULT)) {
                return;
              }

              const results = context.result!.results;
              if (results.length > 0 && results[0].rows.length > 0) {
                localStorage.setItem(STORAGE_KEYS.HAS_OPENED_TABLE_RESULT, "1");
                expandTableResult([results[0]]);
              }
            }

          },
          onError: (error) => {
            if (!isAbortError(error)) {
              console.error(error);
              this.error = error;
            }
          },
        },
      );

      this.messages = messages;
      this.isAborting = false;
      this.isProcessing = false;

      setViewState({
        messages: mapChatMessagesToStoredMessages(messages),
        conversationTitle: this.conversationTitle,
      });

      if (!this.conversationTitle && !this.isGeneratingConversationTitle) {
        this.isGeneratingConversationTitle = true;

        try {
          const title = await this.model!.generateConversationTitle(
            this.messages,
          );

          setTabTitle(title);
          this.conversationTitle = title;

          setViewState({
            messages: mapChatMessagesToStoredMessages(messages),
            conversationTitle: this.conversationTitle,
          });
        } catch (e) {
          // If error occurs when generating title, do nothing
          console.error(e);
        }

        this.isGeneratingConversationTitle = false;
      }

      if (this.queuedMessages.length > 0) {
        await this.stream();
      }
    },
    acceptTool(toolId: string) {
      this.toolExtras[toolId].permission!.response = "accept";
    },
    rejectTool(toolId: string) {
      this.toolExtras[toolId].permission!.response = "reject";
      this.abortStream();
    },
    rejectAllPendingTools() {
      Object.keys(this.toolExtras).forEach((toolId) => {
        if (this.toolExtras[toolId].permission?.response === "pending") {
          this.toolExtras[toolId].permission!.response = "reject";
        }
      });
      this.abortStream();
    },
    waitForPermission(toolMessage: ToolMessage): Promise<boolean> {
      return new Promise<boolean>((resolve) => {
        const unsubscribe = this.$onAction(({ name, args, after }) => {
          if (name === "acceptTool" && args[0] === toolMessage.tool_call_id) {
            unsubscribe();
            after(() => resolve(true));
          } else if (
            (name === "rejectTool" && args[0] === toolMessage.tool_call_id) ||
            name === "rejectAllPendingTools"
          ) {
            unsubscribe();
            after(() => resolve(false));
          }
        });
      });
    },
    abortStream(): void {
      if (!this.model) {
        throw new Error("No model created");
      }
      this.model.abortStreamMessage(new Error("Aborted: user interrupted"));
      this.isAborting = true;
    },
    setProviderId(providerId: ProviderId) {
      this.providerId = providerId;
      localStorage.setItem(STORAGE_KEYS.PROVIDER, providerId);
    },
    async setApiKey(apiKey: string) {
      this.apiKey = apiKey;
      await setEncryptedData("providers.anthropic.apiKey", apiKey);
    },
    setModel(modelId: string) {
      this.pendingModelId = modelId;
    },
    switchModel() {
      if (this.isProcessing) {
        throw new Error("Cannot switch model while processing a message.");
      }
      if (!this.pendingModelId) {
        throw new Error("No model selected.");
      }
      const modelId = this.pendingModelId;
      if (modelId === this.model?.id) {
        return;
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
