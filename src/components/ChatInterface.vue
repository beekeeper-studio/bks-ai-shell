<template>
  <div
    class="chat-container"
    :class="{ 'empty-chat': messages.length === 0 }"
    :data-status="status"
  >
    <div class="scroll-container" ref="scrollContainerRef">
      <div class="header">
        <button class="btn btn-flat-2 settings-btn" @click="$emit('open-configuration')">
          <span class="material-symbols-outlined">settings</span>
          <span class="title-popup">Settings</span>
        </button>
      </div>
      <h1 class="plugin-title">AI Shell</h1>
      <div class="chat-messages">
        <message
          v-for="(message, index) in messages"
          :key="message.id"
          :message="message"
          :pending-tool-call-ids="pendingToolCallIds"
          :status="index === messages.length - 1 ? (status === 'ready' || status === 'error' ? 'ready' : 'processing') : 'ready'"
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
      <PromptInput storage-key="inputHistory" :processing="processing" :selected-model="model"
       @select-model="selectModel" @manage-models="$emit('manage-models')" @submit="submit" @stop="stop"  />
    </div>
  </div>
</template>

<script lang="ts">
import { useAI } from "@/composables/ai";
import { useChatStore, Model } from "@/stores/chat";
import Dropdown from "./common/Dropdown.vue";
import DropdownOption from "./common/DropdownOption.vue";
import _ from "lodash";
import Markdown from "@/components/messages/Markdown.vue";
import Message from "@/components/messages/Message.vue";
import { Message as MessageType } from "ai";
import { PropType } from "vue";
import { mapActions, mapGetters, mapState, mapWritableState } from "pinia";
import { RootBinding } from "@/plugins/appEvent";
import { useInternalDataStore } from "@/stores/internalData";
import BaseInput from "@/components/common/BaseInput.vue";
import PromptInput from "@/components/common/PromptInput.vue";

export default {
  name: "ChatInterface",

  components: {
    Dropdown,
    DropdownOption,
    Message,
    Markdown,
    BaseInput,
    PromptInput,
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
    const ai = useAI({ initialMessages: props.initialMessages });

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
    return {
      isAtBottom: true,
      showFullError: false,
      noModelError: false,
    };
  },

  computed: {
    ...mapGetters(useChatStore, ["systemPrompt"]),
    ...mapWritableState(useChatStore, ["model"]),
    processing() {
      if (this.askingPermission) return false;
      return this.status !== "ready" && this.status !== "error";
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

    submit(input: string) {
      if (!this.model) {
        // FIXME we should catch this and show it on screen
        this.noModelError = true;
        return;
      }

      this.noModelError = false;

      if (this.askingPermission) {
        this.rejectPermission();
      }

      this.send(input, this.getSendOptions());
    },

    async reload() {
      await this.retry(this.getSendOptions());
    },

    stop() {
      if (this.askingPermission) {
        this.rejectPermission();
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
