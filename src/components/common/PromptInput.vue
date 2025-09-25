<template>
  <div class="chat-input-container">
    <BaseInput type="textarea" v-model="input" @keydown.enter="handleEnterKey" @keydown.up="handleUpArrow"
      @keydown.down="handleDownArrow" placeholder="Type your message here" rows="1" />
    <div class="actions">
      <Dropdown :model-value="selectedModel" placeholder="Select Model" aria-label="Model">
        <DropdownOption v-for="optionModel in filteredModels" :key="optionModel.id" :value="optionModel.id"
          :text="optionModel.id" :selected="matchModel(optionModel, selectedModel)"
          @select="$emit('select-model', optionModel)" />
        <div class="dropdown-separator"></div>
        <button class="dropdown-action" @click="$emit('manage-models')">
          Manage models
        </button>
      </Dropdown>
      <button v-if="!processing" @click="submit" class="submit-btn" :disabled="!input.trim()" test-id="submit">
        <span class="material-symbols-outlined">send</span>
      </button>
      <button v-else @click="stop" class="stop-btn" />
    </div>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import BaseInput from "./BaseInput.vue";
import Dropdown from "./Dropdown.vue";
import DropdownOption from "./DropdownOption.vue";
import { Model, useChatStore } from "@/stores/chat";
import { mapActions, mapState } from "pinia";
import { matchModel } from "@/utils";
import { useInternalDataStore } from "@/stores/internalData";
import _ from "lodash";

const maxHistorySize = 50;

export default {
  components: {
    BaseInput,
    Dropdown,
    DropdownOption,
  },

  emits: ["submit", "stop", "manage-models", "select-model"],

  props: {
    processing: Boolean,
    storageKey: {
      type: String,
      required: true,
    },
    selectedModel: Object as PropType<Model>,
  },

  data() {
    const inputHistoryStr = localStorage.getItem(this.storageKey) || "[]";
    const inputHistory: string[] = JSON.parse(inputHistoryStr);
    inputHistory.push("");
    return {
      inputHistory,
      inputIndex: inputHistory.length - 1,
      isAtBottom: true,
    };
  },

  computed: {
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
  },

  methods: {
    ...mapActions(useInternalDataStore, ["setInternal"]),
    matchModel,

    submit() {
      const trimmedInput = this.input.trim();

      // Don't send empty messages
      if (!trimmedInput) return;

      this.addToHistory(this.input);

      this.resetInput();

      this.$emit("submit", trimmedInput);
    },

    stop() {
      this.$emit("stop");
    },

    handleEnterKey(e: KeyboardEvent) {
      if (e.shiftKey) {
        // Allow default behavior (new line) when Shift+Enter is pressed
        return;
      }

      if (!this.processing) {
        e.preventDefault();
        e.stopPropagation();
        this.submit();
      }
    },

    // Handle up/down arrow keys for history navigation
    handleUpArrow(e: KeyboardEvent) {
      const textarea = e.target as HTMLTextAreaElement;
      const text = textarea.value;

      // Is cursor at first line?
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);

      // If there's no newline before cursor or cursor is at position 0, we're at the first line
      if (cursorPos === 0 || textBeforeCursor.lastIndexOf("\n") === -1) {
        // Go back in history
        e.preventDefault();
        e.stopPropagation();

        this.navigateHistory(-1);
      }
    },

    handleDownArrow(e: KeyboardEvent) {
      const textarea = e.target as HTMLTextAreaElement;
      const text = textarea.value;

      // Is cursor at last line?
      const cursorPos = textarea.selectionStart;
      const textAfterCursor = text.substring(cursorPos);

      // If there's no newline after cursor or cursor is at end of text, we're at the last line
      if (cursorPos === text.length || textAfterCursor.indexOf("\n") === -1) {
        // Go forward in history
        e.preventDefault();
        e.stopPropagation();

        this.navigateHistory(1);
      }
    },

    /** Navigate through input history. Returns true if input changed. */
    navigateHistory(direction: 1 | -1) {
      const oldIndex = this.inputIndex;

      this.inputIndex = _.clamp(
        this.inputIndex + direction,
        0,
        this.inputHistory.length - 1,
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

    addToHistory(input: string) {
      const oldHistory = JSON.parse(localStorage.getItem(this.storageKey)!);

      let newHistory = [...oldHistory];

      if (oldHistory[oldHistory.length - 1] === input || input.startsWith(" ")) {
        this.resetHistory(newHistory);
        return;
      }

      newHistory.push(input);

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory = newHistory.slice(-maxHistorySize);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(newHistory));

      this.resetHistory(newHistory);
    },

    resetHistory(history: string[]) {
      this.inputHistory = history;
      this.inputIndex = this.inputHistory.length - 1;
    },

    resetInput() {
      if (this.inputHistory[this.inputHistory.length - 1] === "") {
        this.inputIndex = this.inputHistory.length - 1;
      } else {
        this.inputHistory.push("");
        this.inputIndex = this.inputHistory.length - 1;
      }
    },
  },
};
</script>
