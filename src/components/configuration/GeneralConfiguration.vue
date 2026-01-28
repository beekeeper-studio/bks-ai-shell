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
      "allowExecutionOfReadOnlyQueries",
      "enableAutoCompact",
    ]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
  },
};
</script>
