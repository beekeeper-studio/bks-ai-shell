<template>
  <div class="chat-container" :class="{ 'empty-chat': messages.length === 0 }">
    <div class="scroll-container">
      <h1 class="plugin-title">AI Shell</h1>
      <div class="chat-messages" ref="chatMessagesRef">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.role]"
        >
          <!-- TODO put this at the Message component -->
          <div class="message-content">
            <template v-if="message.role === 'system'" />
            <template v-else v-for="(part, index) of message.parts" :key="index">
              <Message v-if="part.type === 'text'" :content="part.text" />
              <tool-message
                v-else-if="part.type === 'tool-invocation'"
                :toolCall="part.toolInvocation"
                :askingPermission="askingPermission"
                @result-click="handleResultClick"
                @accept="acceptPermission"
                @reject="rejectPermission"
              />
            </template>
          </div>
        </div>
        <div
          class="message error"
          v-if="error && !error.message.includes('User rejected tool call')"
        >
          <div class="message-content">
            Something went wrong.
            <pre v-if="!isErrorTruncated || showFullError" v-text="error" />
            <pre v-else v-text="truncatedError" />
            <button
              v-if="isErrorTruncated"
              @click="showFullError = !showFullError"
              class="btn show-more-btn"
            >
              {{ showFullError ? "Show less" : "Show more" }}
            </button>
          </div>
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
    <div class="chat-input-container">
      <textarea
        v-model="input"
        @keydown.enter="handleEnterKey"
        @keydown.up="handleUpArrow"
        @keydown.down="handleDownArrow"
        placeholder="Type your message here..."
        rows="1"
        v-autoresize
      ></textarea>
      <div class="actions">
        <Dropdown
          :model-value="model"
          placeholder="Select Model"
          aria-label="Model"
        >
          <DropdownOption
            v-for="optionModel in models"
            :key="optionModel.id"
            :value="optionModel.id"
            :text="optionModel.id"
            :selected="optionModel === model"
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
</template>

<script lang="ts">
import { useAI } from "@/composables/ai";
import { useChatStore, Model } from "@/stores/chat";
import Dropdown from "./common/Dropdown.vue";
import DropdownOption from "./common/DropdownOption.vue";
import _ from "lodash";
import ToolMessage from "@/components/messages/ToolMessage.vue";
import Message from "@/components/messages/Message.vue";
import { Message as MessageType } from "ai";
import { PropType } from "vue";
import { mapState, mapWritableState } from "pinia";
import { expandTableResult, QueryResult } from "@beekeeperstudio/plugin";

const maxHistorySize = 50;

export default {
  name: "ChatInterface",

  components: {
    Dropdown,
    DropdownOption,
    ToolMessage,
    Message,
  },

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
      provider: ai.provider,
      input: ai.input,
      error: ai.error,
      status: ai.status,
      setModel: ai.setModel,
      askingPermission: ai.askingPermission,
      acceptPermission: ai.acceptPermission,
      rejectPermission: ai.rejectPermission,
    };
  },

  data() {
    const inputHistoryStr = localStorage.getItem("inputHistory") || "[]";
    const inputHistory = JSON.parse(inputHistoryStr);
    return {
      tempInput: "",
      inputHistory,
      historyIndex: inputHistory.length,
      isNavigatingHistory: false,
      isAtBottom: true,
      showFullError: false,
    };
  },

  computed: {
    ...mapWritableState(useChatStore, ["model"]),
    ...mapState(useChatStore, ["models", "isAborting"]),
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
  },

  watch: {
    messages: {
      async handler() {
        await this.$nextTick();
        if (this.$refs.chatMessagesRef && this.isAtBottom) {
          this.scrollToBottom();
        }
      },
      deep: true,
    },
  },

  async mounted() {
    if (this.model) {
      this.setModel(this.model.provider, this.model.id);
    }
    const chatMessages = this.$refs.chatMessagesRef as HTMLElement;
    chatMessages.addEventListener("scroll", () => {
      // Calculate if we're near bottom (within 50px of bottom)
      const isNearBottom =
        chatMessages.scrollHeight -
          chatMessages.scrollTop -
          chatMessages.clientHeight <
        50;

      this.isAtBottom = isNearBottom;
    });
    await this.$nextTick();
    this.scrollToBottom();
  },

  methods: {
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
      if (
        (cursorPos === 0 || textBeforeCursor.lastIndexOf("\n") === -1) &&
        this.historyIndex > 0
      ) {
        e.preventDefault();
        this.navigateHistory(-1); // Go back in history
      }
    },

    handleDownArrow(e) {
      const textarea = e.target;
      const text = textarea.value;

      // Is cursor at last line?
      const cursorPos = textarea.selectionStart;
      const textAfterCursor = text.substring(cursorPos);

      // If there's no newline after cursor or cursor is at end of text, we're at the last line
      if (
        (cursorPos === text.length || textAfterCursor.indexOf("\n") === -1) &&
        this.historyIndex < this.inputHistory.length - 1
      ) {
        e.preventDefault();
        this.navigateHistory(1); // Go forward in history
      }
    },

    // Navigate through input history
    navigateHistory(direction) {
      // If no history or navigating beyond bounds, do nothing
      if (this.inputHistory.length === 0) return;

      if (this.historyIndex === 0 && direction === -1) return;

      if (
        this.historyIndex >= this.inputHistory.length - 1 &&
        direction === 1
      ) {
        // We are at the last history item
        this.historyIndex = this.inputHistory.length;
        this.input = this.tempInput;
        this.isNavigatingHistory = false;
        return;
      }

      if (!this.isNavigatingHistory) {
        // save current input before navigating
        this.tempInput = this.input;
        this.isNavigatingHistory = true;
      }

      // Calculate new index
      const newIndex = this.historyIndex + direction;

      this.input = this.inputHistory[newIndex];

      this.historyIndex = newIndex;

      // Place cursor at the end of the input text
      this.$nextTick(() => {
        const textarea = document.querySelector("textarea");
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd =
            textarea.value.length;
        }
      });
    },

    submit() {
      const message = this.input.trim();

      // Don't send empty messages
      if (!message) return;

      this.addToHistory(message);

      this.tempInput = "";
      this.input = "";

      if (this.askingPermission) {
        this.rejectPermission(message);
      } else {
        this.send(message);
      }
    },

    addToHistory(input: string) {
      const oldHistory = JSON.parse(localStorage.getItem("inputHistory")!);

      let newHistory = [...this.inputHistory, input];
      if (this.historyIndex < this.inputHistory.length) {
        newHistory[this.historyIndex] = oldHistory[this.historyIndex];
      }

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory = newHistory.slice(-maxHistorySize);
      }

      localStorage.setItem("inputHistory", JSON.stringify(newHistory));

      // Reset history navigation
      this.inputHistory = newHistory;
      this.historyIndex = newHistory.length;
      this.isNavigatingHistory = false;
    },

    stop() {
      if (this.askingPermission) {
        this.rejectPermission();
      } else {
        this.abort()
      }
    },

    async handleResultClick(results: QueryResult[]) {
      await expandTableResult(results);
      await this.$nextTick();
      if (this.isAtBottom) {
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$refs.chatMessagesRef!.scrollTop =
        this.$refs.chatMessagesRef!.scrollHeight;
    },
    selectModel(model: Model) {
      this.setModel(model.provider, model.id);
      this.model = model;
    },
  },
  directives: {
    autoresize: {
      mounted(el: HTMLTextAreaElement) {
        const resize = () => {
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        };

        el._resizeHandler = resize;

        el.addEventListener("input", resize);
        requestAnimationFrame(resize);
      },
      updated(el: HTMLTextAreaElement) {
        el._resizeHandler();
      },
      unmounted(el: HTMLTextAreaElement) {
        el.removeEventListener("input", el._resizeHandler);
      },
    },
  },
};
</script>
