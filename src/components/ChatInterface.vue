<template>
  <div
    class="chat-container"
    :class="{ 'empty-chat': messages.length === 0 }"
    :data-status="status"
  >
    <div class="scroll-container" ref="scrollContainerRef">
      <div class="header">
        <button class="btn settings-btn" @click="$emit('open-configuration')" title="Settings">
          <span class="material-symbols-outlined">settings</span>
        </button>
      </div>
      <h1 class="plugin-title">AI Shell</h1>
      <div class="chat-messages">
        <message
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :pending-tool-call-ids="pendingToolCallIds"
          @accept-permission="acceptPermission"
          @reject-permission="rejectPermission"
        />
        <div
          class="message error"
          v-if="error && !error.message.includes('User rejected tool call')"
        >
          <div class="message-content">
            Something went wrong.
            <div v-if="isOllamaToolError" class="error-hint">
            💡 <strong>Hint:</strong> This might be because your Ollama model doesn't support tools. Try using a different model, or switch to a different provider.
            </div>
            <pre v-if="!isErrorTruncated || showFullError" v-text="error" />
            <pre v-else v-text="truncatedError" />
            <button
              v-if="isErrorTruncated"
              @click="showFullError = !showFullError"
              class="btn show-more-btn"
            >
              {{ showFullError ? "Show less" : "Show more" }}
            </button>
            <button class="btn" @click="() => reload()">
              <span class="material-symbols-outlined">refresh</span>
              Retry
            </button>
          </div>
        </div>
        <div
          class="message error"
          v-if="noModelError"
        >
          <div class="message-content">No model selected</div>
        </div>
        <div
          class="spinner-container"
          :style="{ visibility: showSpinner ? 'visible' : 'hidden' }"
        >
          <span class="spinner" />
        </div>
      </div>
      <div ref="bottomMarker"></div>
    </div>
    <div class="chat-input-container-container">
      <div class="chat-input-container">
        <BaseInput
          type="textarea"
          v-model="input"
          @keydown.enter="handleEnterKey"
          @keydown.up="handleUpArrow"
          @keydown.down="handleDownArrow"
          placeholder="Type your message here"
          rows="1"
        />
        <div class="actions">
          <Dropdown
            :model-value="model"
            placeholder="Select Model"
            aria-label="Model"
          >
            <DropdownOption
              v-for="optionModel in filteredModels"
              :key="optionModel.id"
              :value="optionModel.id"
              :text="optionModel.id"
              :selected="matchModel(optionModel, model)"
              @select="selectModel(optionModel)"
            />
            <div class="dropdown-separator"></div>
            <button class="dropdown-action" @click="$emit('manage-models')">
              Manage models
            </button>
          </Dropdown>
          <button
            v-if="canSendMessage"
            @click="submit"
            class="submit-btn"
            :disabled="!input.trim()"
          >
            <span class="material-symbols-outlined">send</span>
          </button>
          <button v-else @click="stop" class="stop-btn" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useAI } from "@/composables/ai";
import { useChatStore, Model } from "@/stores/chat";
import Dropdown from "./common/Dropdown.vue";
import DropdownOption from "./common/DropdownOption.vue";
import _ from "lodash";
import ToolMessage from "@/components/messages/ToolMessage.vue";
import Markdown from "@/components/messages/Markdown.vue";
import Message from "@/components/messages/Message.vue";
import { Message as MessageType } from "ai";
import { PropType } from "vue";
import { mapActions, mapGetters, mapState, mapWritableState } from "pinia";
import { RootBinding } from "@/plugins/appEvent";
import { useInternalDataStore } from "@/stores/internalData";
import { matchModel } from "@/utils";
import BaseInput from "@/components/common/BaseInput.vue";

const maxHistorySize = 50;

export default {
  name: "ChatInterface",

  components: {
    Dropdown,
    DropdownOption,
    Message,
    ToolMessage,
    Markdown,
    BaseInput,
  },

  emits: ["manage-models", "open-configuration"],

  props: {
    initialMessages: {
      type: Array as PropType<MessageType[]>,
      required: true,
    },
    anthropicApiKey: String,
    openaiApiKey: String,
    googleApiKey: String,
  },

  setup(props) {
    const ai = useAI({
      initialMessages: props.initialMessages,
      anthropicApiKey: props.anthropicApiKey,
      openaiApiKey: props.openaiApiKey,
      googleApiKey: props.googleApiKey,
    });

    return {
      send: ai.send,
      abort: ai.abort,
      messages: ai.messages,
      error: ai.error,
      status: ai.status,
      pendingToolCallIds: ai.pendingToolCallIds,
      askingPermission: ai.askingPermission,
      acceptPermission: ai.acceptPermission,
      rejectPermission: ai.rejectPermission,
      retry: ai.retry,
    };
  },

  data() {
    const inputHistoryStr = localStorage.getItem("inputHistory") || "[]";
    const inputHistory: string[] = JSON.parse(inputHistoryStr);
    inputHistory.push("");
    return {
      inputHistory,
      inputIndex: inputHistory.length - 1,
      isAtBottom: true,
      showFullError: false,
      noModelError: false,
    };
  },

  computed: {
    ...mapGetters(useChatStore, ["systemPrompt"]),
    ...mapWritableState(useChatStore, ["model"]),
    ...mapState(useChatStore, {
      filteredModels(store) {
        return store.models.filter((m) => m.enabled);
      },
    }),
    input: {
      get() {
        return this.inputHistory[this.inputIndex];
      },
      set(value: string) {
        this.inputHistory[this.inputIndex] = value;
      },
    },
    canSendMessage() {
      if (this.askingPermission && this.input.trim().length > 0) return true;
      return this.status === "ready" || this.status === "error";
    },
    showSpinner() {
      return (
        !this.askingPermission &&
        (this.status === "submitted" || this.status === "streaming")
      );
    },
    isErrorTruncated() {
      return this.error && this.error.toString().length > 300;
    },
    truncatedError() {
      return this.error ? this.error.toString().substring(0, 300) + "..." : "";
    },
    isOllamaToolError() {
      if (!this.error || !this.model) return false;
      const errorStr = this.error.toString().toLowerCase();
      const isOllama = this.model.provider === 'ollama';
      const hasToolError = errorStr.includes('bad request');
      return isOllama && hasToolError;
    },

    rootBindings(): RootBinding[] {
      return [
        {
          event: "showedResultTable",
          handler: async () => {
            if (this.isAtBottom) {
              await this.$nextTick();
              this.scrollToBottom();
            }
          },
        },
      ]
    },
  },

  watch: {
    error() {
      console.log(this.error)
    },
    messages: {
      async handler() {
        await this.$nextTick();
        if (this.$refs.scrollContainerRef && this.isAtBottom) {
          this.scrollToBottom();
        }
      },
      deep: true,
    },
  },

  async mounted() {
    const scrollContainer = this.$refs.scrollContainerRef as HTMLElement;
    scrollContainer.addEventListener("scroll", () => {
      // Calculate if we're near bottom (within 50px of bottom)
      const isNearBottom =
        scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight <
        50;

      this.isAtBottom = isNearBottom;
    });
    await this.$nextTick();
    this.scrollToBottom();
  },

  methods: {
    ...mapActions(useInternalDataStore, ["setInternal"]),
    matchModel,
    handleEnterKey(e) {
      if (e.shiftKey) {
        // Allow default behavior (new line) when Shift+Enter is pressed
        return;
      }

      if (this.canSendMessage) {
        e.preventDefault();
        e.stopPropagation();
        this.submit();
      }
    },

    // Handle up/down arrow keys for history navigation
    handleUpArrow(e) {
      const textarea = e.target;
      const text = textarea.value;

      // Is cursor at first line?
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);

      // If there's no newline before cursor or cursor is at position 0, we're at the first line
      if (cursorPos === 0 || textBeforeCursor.lastIndexOf("\n") === -1) {
        // Go back in history
        if (this.navigateHistory(-1)) {
          e.preventDefault();
        }
      }
    },

    handleDownArrow(e) {
      const textarea = e.target;
      const text = textarea.value;

      // Is cursor at last line?
      const cursorPos = textarea.selectionStart;
      const textAfterCursor = text.substring(cursorPos);

      // If there's no newline after cursor or cursor is at end of text, we're at the last line
      if (cursorPos === text.length || textAfterCursor.indexOf("\n") === -1) {
        // Go forward in history
        if (this.navigateHistory(1)) {
          e.preventDefault();
        }
      }
    },

    /** Navigate through input history. Returns true if input changed. */
    navigateHistory(direction: 1 | -1) {
      const oldIndex = this.inputIndex;

      this.inputIndex = _.clamp(
        this.inputIndex + direction,
        0,
        this.inputHistory.length - 1
      );

      const changed = this.inputIndex !== oldIndex;

      if (changed) {
        // Place cursor at the end of the input text
        this.$nextTick(() => {
          const textarea = document.querySelector("textarea");
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd =
              textarea.value.length;
          }
        });
      }

      return changed;
    },

    submit() {
      // Don't add to history if the message starts with a space
      const preventHistory = this.input.startsWith(" ");
      const message = this.input.trim();

      // Don't send empty messages
      if (!message) return;

      if (!this.model) {
        // FIXME we should catch this and show it on screen
        this.noModelError = true;
        return;
      }

      if (!preventHistory) {
        this.addToHistory(message);
      }

      this.noModelError = false;
      this.resetInput();

      if (this.askingPermission) {
        this.rejectPermission(message);
      } else {
        this.send(message, this.getSendOptions());
      }
    },

    async reload() {
      await this.retry(this.getSendOptions());
    },

    resetInput() {
      if (this.inputHistory[this.inputHistory.length - 1] === "") {
        this.inputIndex = this.inputHistory.length - 1;
      } else {
        this.inputHistory.push("");
        this.inputIndex = this.inputHistory.length - 1;
      }
    },

    addToHistory(input: string) {
      const oldHistory = JSON.parse(localStorage.getItem("inputHistory")!);

      let newHistory = [...oldHistory, input];

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory = newHistory.slice(-maxHistorySize);
      }

      localStorage.setItem("inputHistory", JSON.stringify(newHistory));

      // Reset history navigation
      this.inputHistory = newHistory;
      this.inputIndex = newHistory.length - 1;
    },

    stop() {
      if (this.askingPermission) {
        this.rejectPermission();
      } else {
        this.abort();
      }
    },

    scrollToBottom() {
      if (!this.$refs.scrollContainerRef) {
        return;
      }
      this.$refs.scrollContainerRef.scrollTop =
        this.$refs.scrollContainerRef.scrollHeight;
    },
    selectModel(model: Model) {
      this.setInternal("lastUsedModelId", model.id);
      this.model = model;
    },

    getSendOptions() {
      if (!this.model) {
        throw new Error("No model selected");
      }

      return {
        modelId: this.model.id,
        providerId: this.model.provider,
        systemPrompt: this.systemPrompt,
      }
    }
  },
};
</script>
