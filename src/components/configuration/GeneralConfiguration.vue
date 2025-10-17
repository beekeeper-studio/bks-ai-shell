<template>
  <h2>General</h2>
  <BaseInput :model-value="customInstructions" @change="handleChange" type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues." rows="4">
    <template #label>Custom Instructions</template>
    <template #helper>Custom instructions will be appended to the <ExternalLink href="https://github.com/beekeeper-studio/bks-ai-shell/blob/main/instructions">default instructions</ExternalLink> and included with every messages you send as a system prompt. This instructions will be applied globally to all connections.</template>
  </BaseInput>
  <BaseInput type="switch" :model-value="allowExecutionOfReadOnlyQueries" @click="handleSwitchClick">
    <template #label>
      Always allow execution of read-only queries
    </template>
    <template #helper>
      This will allow execution of read-only queries without asking for confirmation in all sessions.
    </template>
  </BaseInput>
  <BaseInput type="number" min="1" :model-value="maxSteps" @input="handleInput">
    <template #label>
      Maximum number of tool calls
    </template>
    <template #helper>
      The maximum number of tool calls allowed in a single generation.
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
      "maxSteps",
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
    handleInput(event: Event) {
      // FIXME: use zod to validate
      const value = (event.target as HTMLInputElement).value;
      const parsed = Number.parseInt(value);
      const finalValue = Number.isNaN(parsed) ? 1 : parsed;
      this.configure("maxSteps", finalValue);
    },
  },
};
</script>
