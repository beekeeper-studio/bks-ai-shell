<template>
  <a @click.prevent="click" :href="href">
    <slot />
  </a>
</template>

<script lang="ts">
import { openExternal } from "@beekeeperstudio/plugin";

export default {
  name: "ExternalLink",

  props: {
    href: {
      type: String,
      required: true,
    },
  },

  methods: {
    click() {
      openExternal(this.href);
    },
  },
};
</script>
