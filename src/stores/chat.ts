import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/config";
import _ from "lodash";
import { Providers, IModel } from "@/providers";
import {
  BaseMessage,
  HumanMessage,
  StoredMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  ToolMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { BaseModel } from "@/providers/BaseModel";
import { BaseProvider } from "@/providers/BaseProvider";
import { expandTableResult, getViewState, setTabTitle, setViewState } from "@beekeeperstudio/plugin";
import { isAbortError } from "@/utils";
import { useConfigurationStore } from "./configuration";

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

interface ChatState {
  /** The active provider. E.g. Anthropic, OpenAI */
  provider?: BaseProvider;

  /** The active model. E.g. Claude 4 Sonnet, Claude 3.5, etc. */
  model?: BaseModel;

  /** The available models returned by the active provider. */
  models: IModel[];

  /** All messages are here a.k.a "conversation". */
  messages: BaseMessage[];

  /** If error happens, this is set. */
  error: unknown;

  /** The title of the conversation. */
  conversationTitle: string;

  /** Queued messages to send to the model. */
  queuedMessages: string[];

  /** Any info that LangChain's ToolMessage does not have. */
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
export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    models: [],
    messages: [],
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
      const configuration = useConfigurationStore();
      await configuration.sync();
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
      const config = useConfigurationStore();
      const providerClass = Providers[config.activeProviderId];
      if (!providerClass) {
        throw new Error(`Unknown provider: ${config.activeProviderId}`);
      }
      this.provider = new providerClass();
      await this.provider.initialize(
        config[`providers.${config.activeProviderId}.apiKey`]
      );
      this.models = this.provider.models;
      const modelId = config.activeModelId || this.models[0].id;
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

      let conversation = this.messages.slice(0, -1);
      const config = useConfigurationStore();

      if (config.summarization && this.summary) {
        const systemMessage = this.messages[0];
        const summaryMessage = new SystemMessage(
          `Continue the conversation based on this summary: ${this.summary.content}`,
        );
        const keptMessages = this.messages.slice(this.summary.startIndex + 1);

        conversation = [systemMessage, summaryMessage, ...keptMessages];
      }

      const messages = await this.model!.sendStreamMessage(
        message,
        conversation,
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
                expandTableResult(results);
              }
            }
          },
          onSummary: (summary) => {
            this.summary = summary;
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
            state: {
              messages: mapChatMessagesToStoredMessages(messages),
              conversationTitle: this.conversationTitle,
            },
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
      if (modelId === this.model?.modelId) {
        return;
      }
      try {
        this.model = this.provider?.createModel({ modelId });
        useConfigurationStore().configure("activeModelId", modelId);
        console.log(`Switched to model: ${modelId}`);
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
  },
});
