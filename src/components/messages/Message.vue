<template>
  <div :class="['message', message.role]">
    <div class="message-content" :class="{ 'literally-empty': isEmpty }">
      <template v-if="message.role === 'system'" />
      <template v-else v-for="(part, index) of message.parts" :key="index">
        <template v-if="part.type === 'text'">
          <template v-if="message.role === 'user'">{{ part.text }}</template>
          <markdown v-else :content="part.text" />
        </template>
        <tool-message
          v-else-if="isToolUIPart(part)"
          :message="message"
          :toolCall="part"
          :disableToolEdit="disableToolEdit"
          @accept="$emit('accept-permission', part.approval?.id)"
          @reject="$emit('reject-permission', {
            toolCallId: part.toolCallId,
            approvalId: part.approval?.id,
            ...$event,
          })"
        />
      </template>
      <span v-if="isEmpty">Empty response</span>
    </div>
    <div class="message-actions" v-if="status === 'ready'">
      <button
        class="btn btn-flat-2 copy-btn"
        :class="{ copied }"
        @click="handleCopyClick"
        :title="copied ? 'Copied' : 'Copy'"
      >
        <span class="material-symbols-outlined copy-icon">content_copy</span>
        <span class="material-symbols-outlined copied-icon">check</span>
      </button>
      <template v-if="message.role === 'assistant' && metadata">
        <button
          class="btn btn-flat-2"
          @click="$refs.metadataPopover!.toggle($event)"
          title="Metadata"
        >
          <span class="material-symbols-outlined">info</span>
        </button>
        <Popover ref="metadataPopover">
          <ul class="metadata-content">
            <li>
              <span>Token count</span>
              <span>{{ metadata.totalTokens }}</span>
            </li>
            <li>
              <span>Model</span>
              <span>{{ metadata.model }}</span>
            </li>
          </ul>
        </Popover>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { isToolUIPart } from "ai";
import Markdown from "@/components/messages/Markdown.vue";
import ToolMessage from "@/components/messages/ToolMessage.vue";
import { clipboard } from "@beekeeperstudio/plugin";
import { isEmptyUIMessage } from "@/utils";
import { UIMessage } from "@/types";
import Popover from "primevue/popover";
import { providerConfigs } from "@/config";

export default {
  name: "Message",

  components: {
    Markdown,
    ToolMessage,
    Popover,
  },

  props: {
    message: {
      type: Object as PropType<UIMessage>,
      required: true,
    },
    status: {
      type: String as PropType<"ready" | "processing">,
      required: true,
    },
  },

  data() {
    return {
      copied: false,
    };
  },

  computed: {
    text(): string {
      const parts = this.message.parts || [];
      let text = "";
      for (const part of parts) {
        if (part.type === "text") {
          text += `${part.text}\n\n`;
        } else if (part.type === "tool-run_query") {
          const query: string | undefined = part.input?.query;
          if (query) {
            text += "```sql\n" + query + "\n```\n\n";
          }
        }
      }
      return text.trim();
    },
    isEmpty() {
      return this.status === "ready" && isEmptyUIMessage(this.message);
    },
    metadata() {
      if (!this.message.metadata) {
        return null;
      }
      const { providerId, modelId, usage } = this.message.metadata;
      const providerObj = providerId ? providerConfigs[providerId] : undefined;
      const provider = providerObj ? providerObj.displayName : "-";
      const modelObj =
        modelId && providerObj
          ? providerObj.models.find((m) => m.id === modelId)
          : undefined;
      const model = modelObj?.displayName || modelId || "-";
      let totalTokens = "-";
      try {
        if (typeof usage?.totalTokens === "number") {
          totalTokens = Intl.NumberFormat().format(usage.totalTokens);
        }
      } catch {}
      return { provider, model, totalTokens };
    },
    disableToolEdit() {
      // For now, we dont support tool edit if the there are multiple query tools
      return this.message.parts.filter((p) => p.type === "tool-run_query").length > 1;
    },
  },

  methods: {
    isToolUIPart,
    async handleCopyClick() {
      await clipboard.writeText(this.text);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 1000);
    },
  },
};
</script>

<style scoped>
ul.metadata-content {
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 12rem;
  max-width: 42rem;

  li {
    padding: 0.25rem 0.5rem;
    display: flex;
    justify-content: space-between;
    /* FIXME should be 0.9rem. But this should match the app font size for now. */
    font-size: 12.6px;

    span:first-child {
      color: var(--text-light);
    }

    span:nth-child(2) {
      margin-left: 0.5rem;
    }
  }
}
</style>
