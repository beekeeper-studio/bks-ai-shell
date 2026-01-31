<template>
  <h2>General</h2>

  <BaseInput
    type="switch"
    :model-value="allowExecutionOfReadOnlyQueries"
    @click="
      configure(
        'allowExecutionOfReadOnlyQueries',
        !allowExecutionOfReadOnlyQueries,
      )
    "
  >
    <template #label>Always allow execution of read-only queries</template>
    <template #helper>
      This will allow execution of read-only queries without asking for
      confirmation in all sessions.
    </template>
  </BaseInput>
  <BaseInput
    type="switch"
    :model-value="enableAutoCompact"
    @click="configure('enableAutoCompact', !enableAutoCompact)"
  >
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
    v-model="unsavedCustomInstructions"
    type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues."
    rows="4"
    :showActions="unsavedCustomInstructions !== customInstructions"
    @discard="unsavedCustomInstructions = customInstructions"
    @save="configure('customInstructions', unsavedCustomInstructions)"
  >
    <template #label>Global</template>
    <template #helper>Used in every conversation</template>
  </BaseInput>
  <BaseInput
    v-model="unsavedConnectionInstructions"
    type="textarea"
    placeholder="E.g. This database contains tables for user management and analytics."
    rows="4"
    :showActions="
      unsavedConnectionInstructions !== currentConnectionInstructions
    "
    @discard="unsavedConnectionInstructions = currentConnectionInstructions"
    @save="configureCustomConnectionInstructions(unsavedConnectionInstructions)"
  >
    <template #label>This connection only</template>
    <template #helper>Used only for this connection</template>
  </BaseInput>
  <BaseInput
    v-if="workspaceInfo.type === 'cloud'"
    v-model="unsavedWorkspaceConnectionInstructions"
    type="textarea"
    rows="4"
    :disabled="!workspaceInfo.isOwner"
    :placeholder="
      workspaceInfo.isOwner
        ? 'E.g. This database contains tables for user management and analytics.'
        : ''
    "
    :showActions="
      unsavedWorkspaceConnectionInstructions !== workspaceConnectionInstructions
    "
    @discard="
      unsavedWorkspaceConnectionInstructions = workspaceConnectionInstructions
    "
    @save="
      configure(
        'workspaceConnectionInstructions',
        unsavedWorkspaceConnectionInstructions,
      )
    "
    :data-empty="unsavedWorkspaceConnectionInstructions.length === 0"
  >
    <template #label>
      Workspace connection
      <span
        v-if="!workspaceInfo.isOwner"
        class="material-symbols-outlined"
        title="Admin access required to edit this field"
      >
        lock
      </span>
    </template>
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

  props: {
    dirty: Boolean,
  },

  emits: ["update:dirty"],

  data() {
    return {
      unsavedCustomInstructions: "",
      unsavedConnectionInstructions: "",
      unsavedWorkspaceConnectionInstructions: "",
    };
  },

  computed: {
    ...mapState(useChatStore, ["workspaceInfo"]),
    ...mapState(useConfigurationStore, [
      "allowExecutionOfReadOnlyQueries",
      "enableAutoCompact",
      "customInstructions",
      "workspaceConnectionInstructions",
    ]),
    ...mapGetters(useConfigurationStore, ["currentConnectionInstructions"]),
    isDirty() {
      return (
        this.unsavedCustomInstructions !== this.customInstructions ||
        this.unsavedConnectionInstructions !==
          this.currentConnectionInstructions ||
        this.unsavedWorkspaceConnectionInstructions !==
          this.workspaceConnectionInstructions
      );
    },
  },

  watch: {
    dirty() {
      this.$emit("update:dirty", this.isDirty);
    },
  },

  methods: {
    ...mapActions(useConfigurationStore, [
      "configure",
      "configureCustomConnectionInstructions",
    ]),
  },

  mounted() {
    this.unsavedCustomInstructions = this.customInstructions;
    this.unsavedConnectionInstructions = this.currentConnectionInstructions;
    this.unsavedWorkspaceConnectionInstructions =
      this.workspaceConnectionInstructions;
  },
};
</script>

<style scoped>
:deep(.input-wrapper):has([data-empty=true])::after {
  content: "No instructions set";
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.727rem; /* FIXME should be 0.831rem */
  font-style: italic;
  color: var(--text-muted);
}
</style>
