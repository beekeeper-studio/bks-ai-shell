<template>
  <div class="chat-container">
    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.type]"
      >
        <div
          class="message-content"
          v-if="message.html"
          v-html="message.html"
        />
        <div class="message-content" v-else v-html="message.content" />
      </div>
      <div v-if="isThinking" class="thinking">
        <div v-for="i in 3" :key="i" class="thinking-dot"></div>
      </div>
    </div>

    <div class="chat-input-container">
      <textarea
        v-model="userInput"
        @keydown.enter="handleEnterKey"
        @keydown.up="handleUpArrow"
        @keydown.down="handleDownArrow"
        placeholder="Type your message here..."
        :disabled="isThinking"
        rows="1"
      ></textarea>
      <div class="actions">
        <select
          id="model-selector"
          aria-label="Model"
          :value="isThinking ? 'loading' : model?.id"
          @change="handleModelChange"
        >
          <option v-if="isThinking" value="loading">Loading models...</option>
          <option
            v-else
            v-for="model in models"
            :key="model.id"
            :value="model.id"
          >
            {{ model.displayName }}
          </option>
        </select>
        <button
          @click="send"
          class="submit-btn"
          :disabled="isThinking || !userInput.trim()"
        >
          <span class="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Providers as UIProviders } from "../providers";
import { mapState, mapActions } from "pinia";
import { useProviderStore } from "../store";

const maxHistorySize = 50;

export default {
  name: "ChatInterface",

  data() {
    const inputHistoryStr = localStorage.getItem("inputHistory") || '[]';
    const inputHistory = JSON.parse(inputHistoryStr);
    return {
      tempInput: "",
      userInput: "",
      inputHistory,
      historyIndex: inputHistory.length,
      isNavigatingHistory: false,
    };
  },

  computed: {
    ...mapState(useProviderStore, [
      "providerId",
      "apiKey",
      "models",
      "messages",
      "isThinking",
      "model",
    ]),
    providers() {
      return UIProviders;
    },
    navigatingHistory() {
      return this.historyIndex === this.inputHistory.length;
    },
  },

  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.chatMessagesRef) {
            this.$refs.chatMessagesRef.scrollTop =
              this.$refs.chatMessagesRef.scrollHeight;
          }
        });
      },
      deep: true,
    },
    userInput() {
      if (this.historyIndex < this.inputHistory.length) {
      this.inputHistory[this.historyIndex] = this.userInput;
    }
    },
  },

  async mounted() {
    await this.initializeProvider();
  },

  methods: {
    ...mapActions(useProviderStore, [
      "switchModelById",
      "initializeProvider",
      "sendMessage",
      "sendStreamMessage",
    ]),

    handleModelChange(event: Event) {
      this.switchModelById((event.target as HTMLSelectElement).value);
    },

    // Handle enter key (send on Enter, new line on Shift+Enter)
    handleEnterKey(e) {
      if (e.shiftKey) {
        // Allow default behavior (new line) when Shift+Enter is pressed
        return;
      }

      if (!this.isThinking) {
        e.preventDefault();
        e.stopPropagation();
        this.send();
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
      if (cursorPos === text.length || textAfterCursor.indexOf("\n") === -1) {
        e.preventDefault();
        this.navigateHistory(1); // Go forward in history
      }
    },

    // Navigate through input history
    navigateHistory(direction) {
      // If no history or navigating beyond bounds, do nothing
      if (this.inputHistory.length === 0) return;

      if (this.historyIndex === 0 && direction === -1) return;

      if (this.historyIndex >= this.inputHistory.length - 1 && direction === 1) {
        // We are at the last history item
        this.historyIndex = this.inputHistory.length;
        this.userInput = this.tempInput;
        this.isNavigatingHistory = false;
        return;
      }

      if (!this.isNavigatingHistory) {
        // save current input before navigating
        this.tempInput = this.userInput;
        this.isNavigatingHistory = true;
      }

      // Calculate new index
      const newIndex = this.historyIndex + direction;

      this.userInput = this.inputHistory[newIndex];

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

    // Send message
    async send() {
      const message = this.userInput.trim();

      // Don't send empty messages
      if (!message || this.isThinking) return;

      this.addToHistory(message);

      this.tempInput = "";
      this.userInput = "";

      await this.sendStreamMessage(message);
    },

    addToHistory(input: string) {
      const oldHistory = JSON.parse(localStorage.getItem("inputHistory")!)

      let newHistory = [...this.inputHistory, input]
      if (this.historyIndex < this.inputHistory.length) {
        newHistory[this.historyIndex] = oldHistory[this.historyIndex]
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
  },
};
</script>
