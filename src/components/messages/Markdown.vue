<template>
  <div class="markdown" v-html="html" @click="handleClick" ref="message"></div>
</template>

<script lang="ts">
import { clipboard } from "@beekeeperstudio/plugin";
import { parseMarkdownToHTML } from "@/markdownParser";

export default {
  props: ["content"],

  data() {
    return {
      copyTimeout: null as NodeJS.Timeout | null,
    };
  },

  computed: {
    html() {
      return parseMarkdownToHTML(this.content);
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
          if (navigator.clipboard) {
            // FIXME remove this
            navigator.clipboard.writeText(text);
          } else {
            clipboard.writeText(text);
          }
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
