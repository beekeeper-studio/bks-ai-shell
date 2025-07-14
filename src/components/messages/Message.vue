<template>
  <div :class="['message', message.role]">
    <div class="message-content">
      <template v-if="message.role === 'system'" />
      <template v-else v-for="(part, index) of message.parts" :key="index">
        <markdown v-if="part.type === 'text'" :content="part.text" />
        <tool-message
          v-else-if="part.type === 'tool-invocation'"
          :toolCall="part.toolInvocation"
          :askingPermission="askingPermission"
          @accept="$emit('accept-permission')"
          @reject="$emit('reject-permission')"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { Message } from "ai";
import Markdown from "@/components/messages/Markdown.vue";
import ToolMessage from "@/components/messages/ToolMessage.vue";

export default {
  name: "Message",

  components: {
    Markdown,
    ToolMessage,
  },

  props: {
    message: {
      type: Object as PropType<Message>,
      required: true,
    },
    askingPermission: Boolean,
  },
};
</script>
