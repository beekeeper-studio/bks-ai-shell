<template>
  <div
    class="chat-container"
    :class="{ 'empty-chat': messages.length === 0 }"
    :data-status="status"
  >
    <div class="scroll-container" ref="scrollContainerRef">
      <div class="header">
        <button
          class="btn btn-flat-2 settings-btn"
          @click="$emit('open-configuration')"
        >
          <span class="material-symbols-outlined">settings</span>
          <span class="title-popup">Settings</span>
        </button>
      </div>
      <div class="plugin-title">
        <h1>AI Shell</h1>
        <p>
          The AI Shell can see your table schemas, and (with your permission)
          run {{ sqlOrCode }} to answer your questions.
          <ExternalLink
            href="https://docs.beekeeperstudio.io/user_guide/sql-ai-shell/"
            >Learn more</ExternalLink
          >.
        </p>
      </div>
      <div class="chat-messages">
        <template v-for="(message, index) in messages" :key="message.id">
          <message
            v-if="
              !(
                message.role === 'assistant' &&
                message.parts.find((p) => p.type === 'data-userEditedToolCall')
              ) &&
              !(
                message.role === 'user' &&
                message.parts.find((p) => p.type === 'data-editedQuery')
              )
            "
            :message="message"
            :status="
              index === messages.length - 1
                ? status === 'ready' || status === 'error'
                  ? 'ready'
                  : 'processing'
                : 'ready'
            "
            @accept-permission="acceptPermission"
            @reject-permission="rejectPermission"
          />
        </template>
        <div class="message error" v-if="isUnexpectedError">
          <div class="message-content">
            Something went wrong.
            <div v-if="isOllamaToolError" class="error-hint">
              💡 <strong>Hint:</strong> This might be because your Ollama model
              doesn't support tools. Try using a different model.
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
        <div class="message error" v-if="noModelError">
          <div class="message-content">No model selected</div>
        </div>
        <div
          class="spinner-container"
          :style="{ visibility: showSpinner ? 'visible' : 'hidden' }"
        >
          <span class="spinner" />
          <span class="label" v-if="compacting">Compacting</span>
        </div>
      </div>
      <button
        v-if="!isAtBottom"
        @click="scrollToBottom({ smooth: true })"
        class="btn scroll-down-btn"
        title="Scroll to bottom"
      >
        <span class="material-symbols-outlined">keyboard_arrow_down</span>
      </button>
    </div>
    <div class="chat-input-container-container">
      <PromptInput
        ref="promptInput"
        storage-key="inputHistory"
        :processing="processing"
        :selected-model="model"
        @select-model="selectModel"
        @manage-models="$emit('manage-models')"
        @submit="submit"
        @stop="stop"
      />
      <div
        v-if="enableAutoCompact && contextLeftUntilAutoCompact <= 15"
        class="auto-compact-notice"
      >
        <template v-if="contextOverflow">
          Auto-compacting on next message
        </template>
        <template v-else>
          Context left until auto-compact:
          {{ contextLeftUntilAutoCompact.toFixed(1) }}%
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useAI } from "@/composables/ai";
import { useChatStore, type Model } from "@/stores/chat";
import _ from "lodash";
import Markdown from "@/components/messages/Markdown.vue";
import Message from "@/components/messages/Message.vue";
import type { UIMessage } from "@/types";
import type { PropType } from "vue";
import { mapActions, mapGetters, mapWritableState } from "pinia";
import type { RootBinding } from "@/plugins/appEvent";
import { useInternalDataStore } from "@/stores/internalData";
import BaseInput from "@/components/common/BaseInput.vue";
import PromptInput from "@/components/common/PromptInput.vue";
import { getConnectionInfo } from "@beekeeperstudio/plugin";
import ExternalLink from "@/components/common/ExternalLink.vue";
import { log } from "@beekeeperstudio/plugin";
import { useConfigurationStore } from "@/stores/configuration";

export default {
  name: "ChatInterface",

  components: {
    Message,
    Markdown,
    BaseInput,
    PromptInput,
    ExternalLink,
  },

  emits: ["manage-models", "open-configuration", "prompt-sent"],

  props: {
    initialMessages: {
      type: Array as PropType<UIMessage[]>,
      required: true,
    },
    /**
     * A prompt this tab was opened with (see `utils/hostTask`). Sent as soon as
     * a model is available, which may not be until the user has finished
     * first-time setup — so this is watched rather than read once on mount.
     */
    pendingPrompt: {
      type: String as PropType<string | null>,
      default: null,
    },
  },

  setup(props) {
    return useAI({ initialMessages: props.initialMessages });
  },

  data() {
    return {
      isAtBottom: true,
      showFullError: false,
      noModelError: false,
      sqlOrCode: "SQL",
      sendingPendingPrompt: false,
    };
  },

  computed: {
    ...mapGetters(useConfigurationStore, ["enableAutoCompact"]),
    ...mapGetters(useChatStore, [
      "systemPrompt",
      "contextOverflow",
      "contextLeftUntilAutoCompact",
    ]),
    ...mapWritableState(useChatStore, ["model"]),
    processing() {
      if (this.hasPendingApprovals) return false;
      return this.status !== "ready" && this.status !== "error";
    },
    showSpinner() {
      if (this.compacting) {
        return true;
      }

      return (
        !this.hasPendingApprovals &&
        (this.status === "submitted" || this.status === "streaming")
      );
    },
    isUnexpectedError() {
      if (!this.error) {
        return false;
      }

      if (!this.error.message) {
        return true;
      }

      if (this.error.message.includes("User rejected tool call")) {
        return false;
      }

      // User aborted request before AI got a chance to respond
      if (this.error.message.includes("aborted without reason")) {
        return false;
      }

      return true;
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
      const isOllama = this.model.provider === "ollama";
      const hasToolError = errorStr.includes("bad request");
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
      ];
    },
  },

  watch: {
    pendingPrompt() {
      this.trySendPendingPrompt();
    },
    model() {
      // A first-time user has no model until they finish setup.
      this.trySendPendingPrompt();
    },
    error() {
      if (this.error) {
        log.error(this.error);
      }
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
    getConnectionInfo().then((connection) => {
      if (
        connection.databaseType === "mongodb" ||
        connection.connectionType === "surrealdb" ||
        connection.connectionType === "redis"
      ) {
        this.sqlOrCode = "Code";
      }
    });

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
    (this.$refs.promptInput as InstanceType<typeof PromptInput>).focus();

    // If the tab was opened with a task and a model is already configured, this
    // fires now. Otherwise the `model` watcher picks it up after setup.
    this.trySendPendingPrompt();
  },

  methods: {
    ...mapActions(useInternalDataStore, ["setInternal"]),

    /**
     * Send the prompt this tab was opened with, once there is a model to send
     * it to. Announces the send before awaiting it so the task is marked
     * consumed even if the request itself fails — a task that re-fires on every
     * remount would be worse than one that fails once.
     */
    async trySendPendingPrompt() {
      if (!this.pendingPrompt || this.sendingPendingPrompt || !this.model) {
        return;
      }

      const prompt = this.pendingPrompt;
      this.sendingPendingPrompt = true;
      this.$emit("prompt-sent");

      try {
        await this.submit(prompt);
      } finally {
        this.sendingPendingPrompt = false;
      }
    },

    async submit(input: string) {
      if (!this.model) {
        // FIXME we should catch this and show it on screen
        this.noModelError = true;
        return;
      }

      this.noModelError = false;

      if (this.hasPendingApprovals) {
        await this.rejectAllPendingApprovals();
      }

      if (this.contextOverflow) {
        await this.compact(input);
      } else {
        await this.send(input);
      }
    },

    async reload() {
      await this.retry();
    },

    stop() {
      if (this.hasPendingApprovals) {
        this.rejectAllPendingApprovals();
      } else {
        this.abort();
      }
    },

    scrollToBottom(options?: { smooth?: boolean }) {
      const container = this.$refs.scrollContainerRef as HTMLElement | undefined;
      if (!container) {
        return;
      }
      if (options?.smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    },

    selectModel(model: Model) {
      this.setInternal("lastUsedModelId", model.id);
      this.model = model;
    },
  },
};
</script>

<style scoped>
.spinner-container .label {
  padding-left: 1ch;
}
.auto-compact-notice {
  width: 100%;
  margin-top: 0.5rem;
  text-align: right;
  color: var(--text);
}
</style>
