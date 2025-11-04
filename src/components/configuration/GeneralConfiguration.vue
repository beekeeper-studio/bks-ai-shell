<template>
  <h2>General</h2>
  <BaseInput :model-value="customInstructions" @change="handleChange" type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues." rows="4">
    <template #label>Custom Instructions</template>
    <template #helper>Custom instructions will be appended to the <ExternalLink href="https://github.com/beekeeper-studio/bks-ai-shell/blob/main/instructions">default instructions</ExternalLink> and included with every message you send as a system prompt. These instructions will be applied globally to all connections.</template>
  </BaseInput>
  <BaseInput type="switch" :model-value="allowExecutionOfReadOnlyQueries" @click="handleSwitchClick">
    <template #label>
      Always allow execution of read-only queries
    </template>
    <template #helper>
      This will allow execution of read-only queries without asking for confirmation in all sessions.
    </template>
  </BaseInput>
</template>

<script lang="ts">
import { mapActions, mapState } from "pinia";
import BaseInput from "@/components/common/BaseInput.vue";
import { useConfigurationStore } from "@/stores/configuration";
import ExternalLink from "@/components/common/ExternalLink.vue";

export default {
  name: "GeneralConfiguration",

  components: {
    BaseInput,
    ExternalLink,
  },

  computed: {
    ...mapState(useConfigurationStore, [
      "customInstructions",
      "allowExecutionOfReadOnlyQueries",
    ]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    handleChange(event: Event) {
      this.configure(
        "customInstructions",
        (event.target as HTMLTextAreaElement).value,
      );
    },
    handleSwitchClick() {
      this.configure("allowExecutionOfReadOnlyQueries", !this.allowExecutionOfReadOnlyQueries);
    },
  },
};
</script>
