<template>
  <div v-html="html"></div>
</template>

<script lang="ts">
import showdown from "showdown";

const converter = new showdown.Converter({ extensions: ["highlight"] });

export default {
  props: ["content"],

  computed: {
    html() {
      return converter.makeHtml(this.content);
    },
  },
};
</script>
