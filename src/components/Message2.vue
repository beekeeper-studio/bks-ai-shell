<template>
  <div class="message">
    <tool-message
      v-if="message.getType() === 'tool'"
      :message="message"
      @result-click="handleResultClick"
    />
    <ai-message v-else-if="message.getType() === 'ai'" :message="message" />
    <human-message
      v-else-if="message.getType() === 'human'"
      :message="message"
    />
  </div>
</template>

<script lang="ts">
import { parseMarkdownToHTML } from "../markdownParser";
import { PropType } from "vue";
import { BaseMessage } from "@langchain/core/messages";
import ToolMessage from "./ToolMessage.vue";
import AiMessage from "./AiMessage.vue";
import HumanMessage from "./HumanMessage.vue";

export default {
  components: { ToolMessage, AiMessage, HumanMessage },

  props: {
    message: {
      type: Object as PropType<BaseMessage>,
      required: true,
    },
  },

  data() {
    return {
      copyTimeout: null as NodeJS.Timeout | null,
    };
  },

  computed: {
    html() {
      return parseMarkdownToHTML(this.message.text);
    },
  },

  methods: {
    async handleClick(e: MouseEvent) {
      let target: HTMLButtonElement;

      if ((e.target as HTMLElement).hasAttribute("data-action")) {
        target = e.target as HTMLButtonElement;
      } else if (
        (e.target as HTMLElement).parentElement?.hasAttribute("data-action")
      ) {
        target = (e.target as HTMLElement).parentElement as HTMLButtonElement;
      } else {
        return;
      }

      const action = target.getAttribute("data-action");
      const actionTargetId = target.getAttribute("data-action-target");

      if (!action || !actionTargetId) {
        return;
      }

      const text = (this.$refs.message as HTMLElement).querySelector(
        `#${actionTargetId}`,
      )?.textContent;

      if (!text) {
        return;
      }

      switch (action) {
        case "copy": {
          navigator.clipboard.writeText(text);
          target.classList.add("copied");
          if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
          }
          this.copyTimeout = setTimeout(
            () => target.classList.remove("copied"),
            3000,
          );
          break;
        }
        case "run": {
          target.classList.add("running");
          // TODO call request("runQuery") here
          target.classList.remove("running");
          break;
        }
      }
    },
  },
};
</script>
