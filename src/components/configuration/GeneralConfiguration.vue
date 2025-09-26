<template>
  <h2>General</h2>
  <BaseInput :model-value="customInstructions" @change="handleChange" type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues." rows="4">
    <template #label>Instructions</template>
    <template #helper>Custom instructions appended to the system prompt for AI calls. This text will be combined with <ExternalLink href="https://github.com/beekeeper-studio/bks-ai-shell/blob/main/instructions">the default instructions</ExternalLink>.</template>
  </BaseInput>
  <Switch :model-value="alwaysAllowQueryExecutionOnReadOnly" @change="handleSwitchChange">
    <template #label>
      Always allow query execution in read-only mode
    </template>
  </Switch>
</template>

<script lang="ts">
import { mapActions, mapState } from "pinia";
import BaseInput from "@/components/common/BaseInput.vue";
import { useConfigurationStore } from "@/stores/configuration";
import ExternalLink from "@/components/common/ExternalLink.vue";
import Switch from "@/components/common/Switch.vue";

export default {
  name: "GeneralConfiguration",

  components: {
    BaseInput,
    ExternalLink,
    Switch,
  },

  computed: {
    ...mapState(useConfigurationStore, [
      "customInstructions",
      "alwaysAllowQueryExecutionOnReadOnly",
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
    handleSwitchChange(value: boolean) {
      this.configure("alwaysAllowQueryExecutionOnReadOnly", value);
    },
  },
};
</script>
