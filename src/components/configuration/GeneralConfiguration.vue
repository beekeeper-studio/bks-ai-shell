<template>
  <h2>General</h2>
  <BaseInput :model-value="customInstructions" @change="handleChange" type="textarea"
    placeholder="E.g. Before running a query, analyze it for any potential issues." rows="4">
    <template #label>Instructions</template>
    <template #helper>Custom instructions to be used in the chat.</template>
  </BaseInput>
</template>

<script lang="ts">
import { mapActions, mapState } from "pinia";
import BaseInput from "@/components/common/BaseInput.vue";
import { useConfigurationStore } from "@/stores/configuration";

export default {
  name: "GeneralConfiguration",

  components: {
    BaseInput,
  },

  computed: {
    ...mapState(useConfigurationStore, ["customInstructions"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    handleChange(event: Event) {
      this.configure(
        "customInstructions",
        (event.target as HTMLTextAreaElement).value,
      );
    },
  },
};
</script>
