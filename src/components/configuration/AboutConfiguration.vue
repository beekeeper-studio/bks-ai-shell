<template>
  <h2>About</h2>
  <ul>
    <li>AI Shell</li>
    <li>Version {{ version }}</li>
    <li>
      <ExternalLink href="https://github.com/beekeeper-studio/bks-ai-shell" class="github-link">
        View on GitHub
      </ExternalLink>
    </li>
    <li>Beekeeper Studio Team</li>
  </ul>
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

<style scoped>
ul {
  margin-top: 0.75rem;
}
</style>
