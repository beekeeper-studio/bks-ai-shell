<template>
  <h2>General</h2>

  <BaseInput type="switch" v-model="allowExecutionOfReadOnlyQueries">
    <template #label>Always allow execution of read-only queries</template>
    <template #helper>
      This will allow execution of read-only queries without asking for
      confirmation in all sessions.
    </template>
  </BaseInput>
  <BaseInput type="switch" v-model="enableAutoCompact">
    <template #label>Enable auto-compact (recommended)</template>
    <template #helper>
      When enabled, the conversation is automatically compacted to avoid hitting
      the context limit.
    </template>
  </BaseInput>

  <hr />

  <h3>Custom Instructions</h3>
  <p class="description">
    Use custom instructions to provide additional context to the AI. These
    instructions are added on top of the
    <ExternalLink
      href="https://github.com/beekeeper-studio/bks-ai-shell/blob/main/instructions"
      >default instructions<span
        style="font-size: 1em"
        class="material-symbols-outlined"
        >arrow_outward</span
      ></ExternalLink
    >.
  </p>
  <BaseInput
    v-model.lazy="customInstructions"
    type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues."
    rows="4"
  >
    <template #label>All Connections</template>
    <template #helper>Used in every conversation.</template>
  </BaseInput>
  <BaseInput
    v-model.lazy="connectionInstructions"
    type="textarea"
    placeholder="E.g. This database contains tables for user management and analytics."
    rows="4"
  >
    <template #label>This Connection Only</template>
    <template #helper>Used only for this connection.</template>
  </BaseInput>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapWritableState } from "pinia";
import BaseInput from "@/components/common/BaseInput.vue";
import { useSettingsStore } from "@/stores/settings";
import ExternalLink from "@/components/common/ExternalLink.vue";

export default {
  name: "GeneralConfiguration",

  components: {
    BaseInput,
    ExternalLink,
  },

  computed: {
    ...mapWritableState(useSettingsStore, [
      "customInstructions",
      "allowExecutionOfReadOnlyQueries",
      "enableAutoCompact",
    ]),
    ...mapGetters(useSettingsStore, ["currentConnectionInstructions"]),
    connectionInstructions: {
      get(): string {
        return this.currentConnectionInstructions;
      },
      set(instructions: string) {
        this.configureCustomConnectionInstructions(instructions);
      },
    },
  },

  methods: {
    ...mapActions(useSettingsStore, [
      "configureCustomConnectionInstructions",
    ]),
  },
};
</script>
