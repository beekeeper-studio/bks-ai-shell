<template>
  <div
    v-if="!message.metadata?.isCompactPrompt"
    :class="['message', message.role]"
  >
    <div class="message-content" :class="{ 'literally-empty': isEmpty }">
      <div class="compact-result" v-if="isCompactResult">
        <details
          :open="showCompactResult"
          @toggle="showCompactResult = $event.target.open"
        >
          <summary>
            <span class="material-symbols-outlined">keyboard_arrow_right</span>
            Show compact
          </summary>
          <div class="compact-result-content">
            <template v-for="(part, index) of message.parts">
              <markdown
                v-if="part.type === 'text'"
                :key="index"
                :content="part.text"
              />
            </template>
          </div>
        </details>
      </div>

      <template v-else-if="message.role === 'system'" />
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
          @reject="
            $emit('reject-permission', {
              toolCallId: part.toolCallId,
              approvalId: part.approval?.id,
              ...$event,
            })
          "
        />
      </template>
      <span v-if="isEmpty">Empty response</span>
    </div>
    <div class="message-actions" v-if="status === 'ready'">
      <button
        class="btn btn-flat-2 copy-btn"
        :class="{ copied }"
        @click="handleCopyClick"
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
      showCompactResult: true,
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
      return (
        this.status === "ready" &&
        isEmptyUIMessage(this.message) &&
        !this.isCompactResult
      );
    },
    isCompactResult() {
      return typeof this.message.metadata?.compactStatus === "string";
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
      // For now, we don't support tool edits when multiple query tools are
      // pending approval.
      return (
        this.message.parts.filter(
          (p) =>
            p.type === "tool-run_query" && p.state === "approval-requested",
        ).length > 1
      );
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

.compact-result {
  border: 1px solid var(--border-color);
  /* padding: 0.5rem 1rem; */
  border-radius: 0.25rem;

  details[open] summary .material-symbols-outlined {
    transform: rotate(90deg);
  }

  summary {
    font-size: 0.75rem;
    height: 2rem;
    display: flex;
    align-items: center;
    padding-inline: 0.5rem;
    background-color: color-mix(
      in srgb,
      var(--theme-base) 5%,
      var(--query-editor-bg)
    );
    user-select: none;
    cursor: pointer;

    .material-symbols-outlined {
      color: var(--text);
      font-size: 1.25rem;
    }

    &::marker {
      display: none;
    }
  }

  .compact-result-content {
    padding-block: 1rem;
    padding-inline: 0.5rem;
    color: var(--text);
  }
}
</style>
