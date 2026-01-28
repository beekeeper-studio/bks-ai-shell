<template>
  <h2>Instructions</h2>
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
    :model-value="customInstructions"
    @change="configure('customInstructions', $event.target.value)"
    type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues."
    rows="4"
  >
    <template #label>Global</template>
    <template #helper>Used in every conversation</template>
  </BaseInput>
  <BaseInput
    :model-value="currentConnectionInstructions"
    @change="configureCustomConnectionInstructions($event.target.value)"
    type="textarea"
    placeholder="E.g. This database contains tables for user management and analytics."
    rows="4"
  >
    <template #label>This connection only</template>
    <template #helper>Used only for this connection</template>
  </BaseInput>
  <BaseInput
    v-if="workspaceInfo.type === 'cloud'"
    :disabled="!workspaceInfo.isOwner"
    :model-value="workspaceConnectionInstructions"
    @change="configure('workspaceConnectionInstructions', $event.target.value)"
    type="textarea"
    :placeholder="workspaceInfo.isOwner ? 'E.g. This database contains tables for user management and analytics.' : ''"
    rows="4"
  >
    <template #label>Workspace connection</template>
    <template #helper
      >Used only for this connection and managed by the workspace
      owner</template
    >
  </BaseInput>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapState } from "pinia";
import BaseInput from "@/components/common/BaseInput.vue";
import { useConfigurationStore } from "@/stores/configuration";
import ExternalLink from "@/components/common/ExternalLink.vue";
import { useChatStore } from "@/stores/chat";

export default {
  name: "GeneralConfiguration",

  components: {
    BaseInput,
    ExternalLink,
  },

  computed: {
    ...mapState(useChatStore, ["workspaceInfo"]),
    ...mapState(useConfigurationStore, [
      "customInstructions",
      "workspaceConnectionInstructions",
    ]),
    ...mapGetters(useConfigurationStore, ["currentConnectionInstructions"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, [
      "configure",
      "configureCustomConnectionInstructions",
    ]),
  },
};
</script>
