<template>
  <h2>About</h2>
  <p class="description">
    AI Shell<br />
    Version {{ version }}<br />
    <ExternalLink
      href="https://github.com/beekeeper-studio/bks-ai-shell"
      class="github-link"
    >
      View on GitHub </ExternalLink
    ><br />
    Beekeeper Studio Team
  </p>
</template>

<script lang="ts">
import manifest from "../../../manifest.json";
import ExternalLink from "../common/ExternalLink.vue";

export default {
  name: "AboutConfiguration",

  components: {
    ExternalLink,
  },

  data() {
    return {
      version: manifest.version,
    };
  },
};
</script>
