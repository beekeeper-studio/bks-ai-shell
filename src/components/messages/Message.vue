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
      <span v-if="isEmpty">
        Empty response
      </span>
    </div>
    <div class="message-actions" v-if="status ==='ready'">
      <button class="btn btn-flat-2 copy-btn" :class="{ copied }" @click="handleCopyClick">
        <span class="material-symbols-outlined copy-icon">content_copy</span>
        <span class="material-symbols-outlined copied-icon">check</span>
        <span class="title-popup">
          <span class="copy-label">Copy</span>
          <span class="copied-label">Copied</span>
        </span>
      </button>
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

export default {
  name: "Message",

  components: {
    Markdown,
    ToolMessage,
  },

  props: {
    message: {
      type: Object as PropType<UIMessage>,
      required: true,
    },
    status: {
      type: String as PropType<"ready" | "processing">,
      required: true,
    }
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
      return this.status === 'ready' && isEmptyUIMessage(this.message);
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
