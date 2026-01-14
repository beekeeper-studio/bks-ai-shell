<template>
  <div class="chat-container" :class="{ 'empty-chat': messages.length === 0 }" :data-status="status">
    <div class="scroll-container" ref="scrollContainerRef">
      <div class="header">
        <button class="btn btn-flat-2 settings-btn" @click="$emit('open-configuration')">
          <span class="material-symbols-outlined">settings</span>
          <span class="title-popup">Settings</span>
        </button>
      </div>
      <div class="plugin-title">
        <h1>AI Shell</h1>
        <p>
          The AI Shell can see your table schemas, and (with your permission)
          run {{ sqlOrCode }} to answer your questions.
          <ExternalLink href="https://docs.beekeeperstudio.io/user_guide/sql-ai-shell/">Learn more</ExternalLink>.
        </p>
      </div>
      <div class="chat-messages">
        <template v-for="(message, index) in messages" :key="message.id">
          <message
            v-if="
              !(message.role === 'assistant' && message.parts.find((p) => p.type === 'data-userEditedToolCall'))
                && !(message.role === 'user' && message.parts.find((p) => p.type === 'data-editedQuery'))
              "
            :message="message"
            :status="index === messages.length - 1 ? (status === 'ready' || status === 'error' ? 'ready' : 'processing') : 'ready'"
            @accept-permission="acceptPermission" @reject-permission="handleRejectPermission" />
        </template>
        <div class="message error" v-if="isUnexpectedError">
          <div class="message-content">
            Something went wrong.
            <div v-if="isOllamaToolError" class="error-hint">
              💡 <strong>Hint:</strong> This might be because your Ollama model doesn't support tools. Try using a
              different model, or switch to a different provider.
            </div>
            <pre v-if="!isErrorTruncated || showFullError" v-text="error" />
            <pre v-else v-text="truncatedError" />
            <button v-if="isErrorTruncated" @click="showFullError = !showFullError" class="btn show-more-btn">
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
        <div class="spinner-container" :style="{ visibility: showSpinner ? 'visible' : 'hidden' }">
          <span class="spinner" />
        </div>
      </div>
      <button v-if="!isAtBottom" @click="scrollToBottom({ smooth: true })" class="btn scroll-down-btn"
        title="Scroll to bottom">
        <span class="material-symbols-outlined">keyboard_arrow_down</span>
      </button>
    </div>
    <div class="chat-input-container-container">
      <PromptInput ref="promptInput" storage-key="inputHistory" :processing="processing" :selected-model="model"
        @select-model="selectModel" @manage-models="$emit('manage-models')" @submit="submit" @stop="stop" />
    </div>
  </div>
</template>

<script lang="ts">
import { useAI } from "@/composables/ai";
import { useChatStore, Model } from "@/stores/chat";
import _ from "lodash";
import Markdown from "@/components/messages/Markdown.vue";
import Message from "@/components/messages/Message.vue";
import type { UIMessage } from "@/types";
import { PropType } from "vue";
import { mapActions, mapGetters, mapWritableState } from "pinia";
import { RootBinding } from "@/plugins/appEvent";
import { useInternalDataStore } from "@/stores/internalData";
import BaseInput from "@/components/common/BaseInput.vue";
import PromptInput from "@/components/common/PromptInput.vue";
import { getConnectionInfo } from "@beekeeperstudio/plugin";
import ExternalLink from "@/components/common/ExternalLink.vue";
import { log } from "@beekeeperstudio/plugin";

export default {
  name: "ChatInterface",

  components: {
    Message,
    Markdown,
    BaseInput,
    PromptInput,
    ExternalLink,
  },

  emits: ["manage-models", "open-configuration"],

  props: {
    initialMessages: {
      type: Array as PropType<UIMessage[]>,
      required: true,
    },
  },

  setup(props) {
    const ai = useAI({ initialMessages: props.initialMessages });

    return {
      send: ai.send,
      abort: ai.abort,
      messages: ai.messages,
      error: ai.error,
      status: ai.status,
      acceptPermission: ai.acceptPermission,
      rejectPermission: ai.rejectPermission,
      rejectAllPendingApprovals: ai.rejectAllPendingApprovals,
      hasPendingApprovals: ai.hasPendingApprovals,
      retry: ai.retry,
    };
  },

  data() {
    return {
      isAtBottom: true,
      showFullError: false,
      noModelError: false,
      sqlOrCode: "SQL",
    };
  },

  computed: {
    ...mapGetters(useChatStore, ["systemPrompt"]),
    ...mapWritableState(useChatStore, ["model"]),
    processing() {
      if (this.hasPendingApprovals) return false;
      return this.status !== "ready" && this.status !== "error";
    },
    showSpinner() {
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

      if (this.error.message.includes('User rejected tool call')) {
        return false;
      }

      // User aborted request before AI got a chance to respond
      if (this.error.message.includes('aborted without reason')) {
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
      if (connection.databaseType === "mongodb"
        || connection.connectionType === "surrealdb"
        || connection.connectionType === "redis") {
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
  },

  methods: {
    ...mapActions(useInternalDataStore, ["setInternal"]),

    submit(input: string) {
      if (!this.model) {
        // FIXME we should catch this and show it on screen
        this.noModelError = true;
        return;
      }

      this.noModelError = false;

      if (this.hasPendingApprovals) {
        this.rejectAllPendingApprovals();
      }

      this.send(input);
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
      if (!this.$refs.scrollContainerRef) {
        return;
      }
      if (options?.smooth) {
        this.$refs.scrollContainerRef.scrollTo({
          top: this.$refs.scrollContainerRef.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        this.$refs.scrollContainerRef.scrollTop =
          this.$refs.scrollContainerRef.scrollHeight;
      }
    },

    selectModel(model: Model) {
      this.setInternal("lastUsedModelId", model.id);
      this.model = model;
    },

    handleRejectPermission(options: {
      toolCallId: string;
      approvalId: string;
      editedQuery?: string;
    }) {
      if (options.editedQuery) {
        this.rejectPermission({
          toolCallId: options.toolCallId,
          approvalId: options.approvalId,
          editedQuery: options.editedQuery,
        });
      } else {
        this.rejectPermission(options.approvalId);
      }
    },
  },
};
</script>
