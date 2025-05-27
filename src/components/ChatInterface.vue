<template>
  <div class="chat-container">
    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.getType()]"
      >
        <!-- TODO put this in to the Message component -->
        <div class="message-content">
          <tool-message
            v-if="message.getType() === 'tool'"
            :message="message"
          />
          <template v-else-if="message.getType() === 'ai'">
            <Message :content="message.text" />
            <template v-if="message.tool_calls">
              <div
                class="tool-call"
                :class="{ active: activeToolId === tool_call.id }"
                v-for="tool_call in message.tool_calls"
                :key="tool_call.id"
              >
                <div class="tool-call-name">
                  {{ getDisplayNameOfTool(tool_call) }}
                  <template v-if="tools[tool_call.id]?.permissionResolved">
                    <span
                      v-if="
                        tools[tool_call.id]?.permissionResponse === 'reject'
                      "
                      class="material-symbols-outlined reject-icon"
                      >close</span
                    >
                    <span
                      v-if="
                        tools[tool_call.id]?.permissionResponse === 'accept'
                      "
                      class="material-symbols-outlined accept-icon"
                      >check</span
                    >
                  </template>
                </div>
                <Message
                  v-if="tool_call.name === 'run_query'"
                  :content="'```sql\n' + tool_call.args.query + '\n```'"
                />
                <div
                  v-if="
                    activeToolId === tool_call.id && activeTool?.asksPermission
                  "
                >
                  <template v-if="!activeTool.permissionResolved">
                    <template v-if="activeTool.name === 'run_query'">
                      Do you want to run this query?
                    </template>
                    <template v-else>Do you want to proceed?</template>
                  </template>
                  <div class="tool-permission-buttons">
                    <button
                      v-if="activeTool.permissionResponse !== 'reject'"
                      class="accept-btn"
                      @click="activeTool.permissionResponse = 'accept'"
                      :disabled="activeTool.permissionResolved"
                    >
                      Yes
                      <span class="material-symbols-outlined accept-icon"
                        >check</span
                      >
                    </button>
                    <button
                      v-if="activeTool.permissionResponse !== 'accept'"
                      class="reject-btn"
                      @click="activeTool.permissionResponse = 'reject'"
                      :disabled="activeTool.permissionResolved"
                    >
                      No
                      <span class="material-symbols-outlined reject-icon"
                        >close</span
                      >
                    </button>
                    <span
                      v-if="activeTool.permissionResolved"
                      class="spinner"
                    />
                  </div>
                </div>
              </div>
            </template>
          </template>
          <template v-else>
            {{ message.text }}
          </template>
        </div>
      </div>
      <div class="message error" v-if="error">
        <div class="message-content">
          Something went wrong. Please see the console for more details.
        </div>
      </div>
      <div v-if="isThinking" class="spinner" />
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
        v-autoresize
      ></textarea>
      <div class="actions">
        <select
          id="model-selector"
          aria-label="Model"
          :value="model?.id"
          @change="handleModelChange"
        >
          <option v-if="isThinking" value="loading">Loading models...</option>
          <option
            v-else
            v-for="model in models"
            :key="model.id"
            :value="model.id"
          >
            {{ model.id }}
          </option>
        </select>
        <button
          v-if="!isThinking && !isCallingTool"
          @click="send"
          class="submit-btn"
          :disabled="isThinking || !userInput.trim()"
        >
          <span class="material-symbols-outlined">send</span>
        </button>
        <button v-else @click="stop" class="stop-btn" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Providers as UIProviders } from "../providers/modelFactory";
import { mapState, mapActions } from "pinia";
import { useProviderStore } from "../store";
import Message from "./Message.vue";
import ToolMessage from "./ToolMessage.vue";
import { safeJSONStringify } from "../utils";
import _ from "lodash";

const maxHistorySize = 50;

export default {
  name: "ChatInterface",

  components: {
    Message,
    ToolMessage,
  },

  data() {
    const inputHistoryStr = localStorage.getItem("inputHistory") || "[]";
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
      "activeTool",
      "activeToolId",
      "providerId",
      "provider",
      "model",
      "apiKey",
      "models",
      "messages",
      "isThinking",
      "isCallingTool",
      "tools",
      "error",
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
      async handler() {
        await this.$nextTick();
        if (this.$refs.chatMessagesRef) {
          this.$refs.chatMessagesRef.scrollTop =
            this.$refs.chatMessagesRef.scrollHeight;
        }
      },
      deep: true,
    },
    async activeTool() {
      await this.$nextTick();
      if (this.$refs.chatMessagesRef) {
        this.$refs.chatMessagesRef.scrollTop =
          this.$refs.chatMessagesRef.scrollHeight;
      }
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
      "setModel",
      "initializeProvider",
      "sendStreamMessage",
      "stopStreamMessage",
    ]),

    handleModelChange(event: Event) {
      this.setModel((event.target as HTMLSelectElement).value);
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

    stop() {
      this.stopStreamMessage();
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

    log(...args) {
      console.log(...args);
    },

    getDisplayNameOfTool(tool) {
      if (tool.name === "get_columns") {
        if (tool.args.schema) {
          return `Get Columns (schema: ${tool.args.schema}, table: ${tool.args.table})`;
        }
        return `Get Columns (table: ${tool.args.table})`;
      }
      return tool.name.split("_").map(_.capitalize).join(" ");
    },

    tryJSONParse(str: string) {
      try {
        str = safeJSONStringify(JSON.parse(str), null, 2);
      } catch (e) {
        // do nothing
      }
      return "```json\n" + str + "\n```";
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
