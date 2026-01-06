<template>
  <h2>General</h2>
  <BaseInput
    :model-value="customInstructions"
    @change="configure('customInstructions', $event.target.value)"
    type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues."
    rows="4"
  >
    <template #label>
      Custom Instructions <span style="color: var(--text-muted)">(Global)</span>
    </template>
    <template #helper
      >Custom instructions will be appended to the
      <ExternalLink
        href="https://github.com/beekeeper-studio/bks-ai-shell/blob/main/instructions"
        >default instructions</ExternalLink
      >
      and included with every message you send as a system prompt. These
      instructions will be applied globally to all connections.</template
    >
  </BaseInput>
  <BaseInput
    :model-value="currentLocalInstructions"
    @change="setCustomLocalInstructions($event.target.value)"
    type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues."
    rows="4"
  >
    <template #label>
      Custom Instructions <span style="color: var(--text-muted)">(Local)</span>
    </template>
    <template #helper
      >Custom instructions will be appended to the
      <ExternalLink
        href="https://github.com/beekeeper-studio/bks-ai-shell/blob/main/instructions"
        >default instructions</ExternalLink
      >
      and included with every message you send as a system prompt. These
      instructions will be applied locally to the current connection.</template
    >
  </BaseInput>
  <BaseInput
    type="switch"
    :model-value="allowExecutionOfReadOnlyQueries"
    @click="handleSwitchClick"
  >
    <template #label> Always allow execution of read-only queries </template>
    <template #helper>
      This will allow execution of read-only queries without asking for
      confirmation in all sessions.
    </template>
  </BaseInput>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapState } from "pinia";
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
    ...mapGetters(useConfigurationStore, ["currentLocalInstructions"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, [
      "configure",
      "setCustomLocalInstructions",
    ]),
    handleSwitchClick() {
      this.configure(
        "allowExecutionOfReadOnlyQueries",
        !this.allowExecutionOfReadOnlyQueries,
      );
    },
  },
};
</script>
