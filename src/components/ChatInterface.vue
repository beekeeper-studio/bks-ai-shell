<template>
  <div class="chat-container" :class="{ 'empty-chat': messages.length <= 1 }">
    <h1 class="plugin-title">AI Shell</h1>
    <div class="chat-messages" ref="chatMessagesRef">
      <template v-for="(message, index) in messages" :key="index">
        <message2 v-if="index !== 0" :message="message" />
        <div v-if="false" class="message-content">
          <template v-if="index === 0"></template>
          <tool-message
            v-else-if="message.getType() === 'tool'"
            :message="message"
            @result-click="handleResultClick"
          />
          <template v-else-if="message.getType() === 'ai'">
            <Message :content="message.text" />
            <template v-if="message.tool_calls">
              <div
                class="tool-call"
                :class="{
                  active:
                    toolExtras[tool_call.id]?.permission?.response ===
                    'pending',
                }"
                v-for="tool_call in message.tool_calls"
                :key="tool_call.id"
              >
                <div class="tool-call-name">
                  {{ getDisplayNameOfTool(tool_call) }}
                  <span
                    v-if="
                      toolExtras[tool_call.id]?.permission?.response ===
                      'reject'
                    "
                    class="material-symbols-outlined reject-icon"
                  >
                    close
                  </span>
                  <span
                    v-if="
                      toolExtras[tool_call.id]?.permission?.response ===
                      'accept'
                    "
                    class="material-symbols-outlined accept-icon"
                  >
                    check
                  </span>
                </div>
                <Message
                  v-if="tool_call.name === 'run_query'"
                  :content="'```sql\n' + (tool_call.args.query || '') + '\n```'"
                />
                <div
                  v-if="
                    toolExtras[tool_call.id]?.permission?.response === 'pending'
                  "
                >
                  <template v-if="tool_call.name === 'run_query'">
                    Do you want to run this query?
                  </template>
                  <template v-else>Do you want to proceed?</template>
                  <div class="tool-permission-buttons">
                    <button
                      class="accept-btn"
                      @click="acceptTool(tool_call.id)"
                    >
                      Yes
                      <span class="material-symbols-outlined accept-icon">
                        check
                      </span>
                    </button>
                    <button
                      class="reject-btn"
                      @click="rejectTool(tool_call.id)"
                    >
                      No
                      <span class="material-symbols-outlined reject-icon">
                        close
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </template>
          <template v-else>
            {{ message.text }}
          </template>
        </div>
      </template>
      <div class="message error" v-if="error">
        <div class="message-content">Something went wrong. {{ error }}</div>
      </div>
      <div v-if="isProcessing && !isWaitingPermission" class="spinner" />
    </div>

    <div class="chat-input-container">
      <textarea
        v-model="userInput"
        @keydown.enter="handleEnterKey"
        @keydown.up="handleUpArrow"
        @keydown.down="handleDownArrow"
        placeholder="Type your message here..."
        rows="1"
        v-autoresize
      ></textarea>
      <div class="actions">
        <Dropdown
          :model-value="pendingModelId"
          placeholder="Select Model"
          aria-label="Model"
          @update:model-value="setModel"
        >
          <DropdownOption
            v-for="modelOption in models"
            :key="modelOption.id"
            :value="modelOption.id"
            :text="modelOption.id"
            :selected="modelOption.id === pendingModelId"
            @select="setModel"
          />
          <div class="dropdown-separator"></div>
          <button class="dropdown-action" @click="handleManageModels">
            Manage models
          </button>
        </Dropdown>
        <button
          v-if="canSendMessage"
          @click="send"
          class="submit-btn"
          :disabled="!userInput.trim()"
        >
          <span class="material-symbols-outlined">send</span>
        </button>
        <button v-else @click="stop" class="stop-btn" />
      </div>
      <div ref="bottomMarker"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Providers as UIProviders } from "../providers/modelFactory";
import { mapState, mapActions, mapGetters } from "pinia";
import { useProviderStore } from "../store";
import Message from "./Message.vue";
import Message2 from "./Message2.vue";
import ToolMessage from "./ToolMessage.vue";
import Dropdown from "./common/Dropdown.vue";
import DropdownOption from "./common/DropdownOption.vue";
import { safeJSONStringify } from "../utils";
import _ from "lodash";
import { request, QueryResult } from "@beekeeperstudio/plugin";

const maxHistorySize = 50;

export default {
  name: "ChatInterface",

  components: {
    Message,
    Message2,
    ToolMessage,
    Dropdown,
    DropdownOption,
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
      isAtBottom: true,
    };
  },

  computed: {
    ...mapState(useProviderStore, [
      "providerId",
      "provider",
      "model",
      "pendingModelId",
      "apiKey",
      "models",
      "messages",
      "tools",
      "error",
      "isProcessing",
      "toolExtras",
      "isWaitingPermission",
    ]),
    ...mapGetters(useProviderStore, ["canSendMessage"]),
    providers() {
      return UIProviders;
    },
    navigatingHistory() {
      return this.historyIndex === this.inputHistory.length;
    },
    messagesAndToolExtras() {
      return {
        messages: this.messages,
        toolExtras: this.toolExtras,
      };
    },
  },

  watch: {
    messagesAndToolExtras: {
      async handler() {
        await this.$nextTick();
        if (this.$refs.chatMessagesRef && this.isAtBottom) {
          this.scrollToBottom();
        }
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
    ...mapActions(useProviderStore, [
      "setModel",
      "queueMessage",
      "abortStream",
      "acceptTool",
      "rejectTool",
    ]),

    handleManageModels() {
      // Navigate back to API key form to manage models/providers
      this.$emit("navigate-to-api-form");
    },

    // Handle enter key (send on Enter, new line on Shift+Enter)
    handleEnterKey(e) {
      if (e.shiftKey) {
        // Allow default behavior (new line) when Shift+Enter is pressed
        return;
      }

      if (this.canSendMessage) {
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
    send() {
      const message = this.userInput.trim();

      // Don't send empty messages
      if (!message) return;

      this.addToHistory(message);

      this.tempInput = "";
      this.userInput = "";

      this.queueMessage(message);
    },

    stop() {
      this.abortStream();
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
    async handleResultClick(results: QueryResult[]) {
      await request("expandTableResult", { results });
      await this.$nextTick();
      if (this.isAtBottom) {
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$refs.chatMessagesRef!.scrollTop =
        this.$refs.chatMessagesRef!.scrollHeight;
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
