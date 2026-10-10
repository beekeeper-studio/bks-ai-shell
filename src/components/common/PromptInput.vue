<template>
  <div class="chat-input-container">
    <Textarea
      ref="input"
      v-model="input"
      placeholder="Type your message here"
      rows="1"
      auto-resize
      @keydown.enter="handleEnterKey"
      @keydown.up="handleUpArrow"
      @keydown.down="handleDownArrow"
    />
    <div class="actions" @click.self="focus()">
      <div
        class="model-selection"
        :class="{ 'please-select-a-model': pleaseSelectAModel }"
        @click="handleModelSelectionClick"
      >
        <bks-context-menu
          v-if="menuEvent"
          :options="menuOptions"
          :event="menuEvent"
          @bks-destroyed="menuEvent = null"
        />
        <button
          class="btn btn-small dropdown-trigger"
          @click="menuEvent = $event"
        >
          {{ selectedModel ? selectedModel.displayName : "Select model" }}
        </button>
        <div class="please-select-a-model-hint">Please select a model</div>
      </div>
      <button
        v-if="!processing"
        @click="submit"
        class="submit-btn"
        :disabled="!input.trim()"
        test-id="submit"
      >
        <span class="material-symbols-outlined">send</span>
      </button>
      <button v-else @click="stop" class="stop-btn" />
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import Textarea from "primevue/textarea";
import { type Model, useChatStore } from "@/stores/chat";
import { mapActions, mapState } from "pinia";
import { matchModel } from "@/utils";
import { useInternalDataStore } from "@/stores/internalData";
import _ from "lodash";
import type { MenuItem } from "@beekeeperstudio/ui-kit";
import { defineComponent } from "vue";

const maxHistorySize = 50;

function loadInputHistory(storageKey: string): string[] {
  const inputHistoryStr = localStorage.getItem(storageKey) || "[]";
  return JSON.parse(inputHistoryStr);
}

export default defineComponent({
  components: {
    Textarea,
  },

  emits: ["submit", "stop", "manage-models", "select-model"],

  // FIXME: Strip this out for now cause vue-tsc isn't happy
  // See https://github.com/vuejs/language-tools/issues/5069
  // expose: ["focus"],

  props: {
    processing: Boolean,
    storageKey: {
      type: String,
      required: true,
    },
    selectedModel: Object as PropType<Model>,
    initialValue: String,
  },

  data() {
    const inputHistory: string[] = loadInputHistory(this.storageKey);
    inputHistory.push(this.initialValue ?? "");
    return {
      inputHistory,
      inputIndex: inputHistory.length - 1,
      isAtBottom: true,
      pleaseSelectAModel: false,
      menuEvent: null as MouseEvent | null,
      resizeObserver: null as ResizeObserver | null,
    };
  },

  computed: {
    ...mapState(useChatStore, ["models", "providers"]),
    latestModels(): Model[] {
      const latestModels: Model[] = [];
      for (const provider of this.providers) {
        // Each provider's models are listed newest first in config.ts
        const latestModel = provider.models.find((model) => model.enabled);
        if (latestModel) {
          latestModels.push(latestModel);
        }
      }
      return latestModels;
    },
    moreModels(): Model[] {
      return this.models.filter(
        (model) => model.enabled && !this.latestModels.includes(model),
      );
    },
    latestModelItems(): MenuItem[] {
      return this.latestModels.map((model) => ({
        label: model.displayName,
        icon: model.id === this.selectedModel?.id ? "check" : undefined,
        handler: () => this.$emit("select-model", model),
      }));
    },
    moreModelItems(): MenuItem[] {
      return this.moreModels.map((model) => ({
        label: model.displayName,
        icon: model.id === this.selectedModel?.id ? "check" : undefined,
        handler: () => this.$emit("select-model", model),
      }));
    },
    menuOptions(): MenuItem[] {
      if (this.models.length === 0) {
        return [
          {
            label: "Manage models",
            handler: () => this.$emit("manage-models"),
          },
        ];
      }
      if (this.moreModelItems.length > 0) {
        return [
          ...this.latestModelItems,
          {
            label: "More models",
            items: this.moreModelItems,
            handler: () => {},
          },
          { type: "divider", id: "divider" },
          {
            label: "Manage models",
            handler: () => this.$emit("manage-models"),
          },
        ];
      }
      return [
        ...this.latestModelItems,
        { type: "divider", id: "divider" },
        {
          label: "Manage models",
          handler: () => this.$emit("manage-models"),
        },
      ];
    },
    input: {
      get(): string {
        return this.inputHistory[this.inputIndex] ?? "";
      },
      set(value: string) {
        this.inputHistory[this.inputIndex] = value;
      },
    },
  },

  methods: {
    ...mapActions(useInternalDataStore, ["setInternal"]),
    matchModel,

    focus() {
      const input = this.$refs.input as any;
      if (input) {
        input.$el?.focus();
      }
    },

    submit() {
      const trimmedInput = this.input.trim();

      // Don't send empty messages
      if (!trimmedInput) return;

      if (!this.selectedModel) {
        this.pleaseSelectAModel = true;
        return;
      }

      this.addToHistory(this.input);

      this.resetInput();

      this.$emit("submit", trimmedInput);
    },

    stop() {
      this.$emit("stop");
    },

    handleModelSelectionClick() {
      this.pleaseSelectAModel = false;
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
      const oldHistory = loadInputHistory(this.storageKey);

      let newHistory = [...oldHistory];

      if (
        oldHistory[oldHistory.length - 1] === input ||
        input.startsWith(" ")
      ) {
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

  mounted() {
    this.$nextTick(() => {
      const input = this.$refs.input as any;
      if (!input) return;
      const textarea = input.$el as HTMLTextAreaElement;
      this.resizeObserver = new ResizeObserver(() => {
        const maxHeight = document.body.offsetHeight * 0.3;
        if (textarea.scrollHeight > maxHeight) {
          textarea.style.maxHeight = `${maxHeight}px`;
          textarea.style.overflowY = "auto";
        } else {
          textarea.style.maxHeight = "";
          textarea.style.overflowY = "";
        }
      });
      this.resizeObserver.observe(textarea);
      this.resizeObserver.observe(document.body);
    });
  },

  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
});
</script>

<style scoped>
.chat-input-container {
  --p-textarea-hover-border-color: transparent;
  --p-textarea-focus-border-color: transparent;
  padding-top: 0.25rem;
}

.actions {
  cursor: text;
}
</style>
