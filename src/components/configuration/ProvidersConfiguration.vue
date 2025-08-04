<template>
  <h2>API Keys</h2>
  <ApiInfo />
  <api-key-form />

  <h2>OpenAI Compatible</h2>
  <BaseInput :model-value="providers_openaiCompat_url"
    @update:modelValue="configure('providers_openaiCompat_url', $event)">
    <template #label>URL</template>
  </BaseInput>
  <ToggleFormArea>
    <template #header>
      <h3>Headers</h3>
    </template>
    <KeyValueListInput :model-value="providers_openaiCompat_headers"
      @update:modelValue="configure('providers_openaiCompat_headers', $event)" />
  </ToggleFormArea>

  <h2>Ollama</h2>
  <BaseInput :model-value="providers_ollama_url" @update:modelValue="configure('providers_ollama_url', $event)">
    <template #label>URL</template>
  </BaseInput>
  <ToggleFormArea>
    <template #header>
      <h3>Headers</h3>
    </template>
    <KeyValueListInput :model-value="providers_ollama_headers"
      @update:modelValue="configure('providers_ollama_headers', $event)" />
  </ToggleFormArea>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import KeyValueListInput from "../common/KeyValueListInput.vue";
import ToggleFormArea from "../common/ToggleFormArea.vue";
import { useConfigurationStore } from "@/stores/configuration";
import { mapState, mapActions } from "pinia";

export default {
  name: "ProvidersConfiguration",

  components: {
    ApiKeyForm,
    ApiInfo,
    BaseInput,
    KeyValueListInput,
    ToggleFormArea,
  },

  computed: {
    ...mapState(useConfigurationStore, [
      "providers_openaiCompat_url",
      "providers_openaiCompat_headers",
      "providers_ollama_url",
      "providers_ollama_headers",
    ]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
  },
};
</script>
