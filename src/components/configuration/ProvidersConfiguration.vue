<template>
  <form @submit.prevent class="config-form">
    <h2>API Keys</h2>
    <ApiInfo />
    <api-key-form />
  </form>

  <form @submit.prevent class="config-form">
    <h3>OpenAI Compatible</h3>
    <p class="description">
      Connect to any service using OpenAI's API format.
    </p>
    <template v-for="(error, index) in errors" :key="index">
      <div v-if="error.providerId === 'openaiCompat'" class="error-message">
        {{ error }}
      </div>
    </template>
    <BaseInput :model-value="providers_openaiCompat_baseUrl"
      @update:modelValue="configure('providers_openaiCompat_baseUrl', $event)" @change="handleChange($event, 'openaiCompat')">
      <template #label>URL</template>
      <template #helper>Base URL for an API service that implements the OpenAI API format (e.g., local LLMs, alternative providers).</template>
    </BaseInput>
    <BaseInput type="password" :model-value="providers_openaiCompat_apiKey"
      @update:modelValue="configure('providers_openaiCompat_apiKey', $event)" @change="handleChange($event, 'openaiCompat')">
      <template #label>API Key</template>
    </BaseInput>
    <BaseInput type="textarea" :model-value="providers_openaiCompat_headers"
      @update:modelValue="configure('providers_openaiCompat_headers', $event)" @change="handleChange($event, 'openaiCompat')">
      <template #label>Headers</template>
    </BaseInput>
  </form>

  <form @submit.prevent class="config-form">
    <h3>Ollama</h3>
    <BaseInput :model-value="providers_ollama_baseUrl"
      @update:modelValue="configure('providers_ollama_baseUrl', $event)" @change="handleChange($event, 'ollama')">
      <template #label>URL</template>
      <template #helper>Ollama server URL (default: http://localhost:11434 for local installations).</template>
    </BaseInput>
  </form>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import ToggleFormArea from "../common/ToggleFormArea.vue";
import { useConfigurationStore } from "@/stores/configuration";
import { mapState, mapActions } from "pinia";
import { AvailableProvidersWithDynamicModels } from "@/config";
import { useChatStore } from "@/stores/chat";

export default {
  name: "ProvidersConfiguration",

  components: {
    ApiKeyForm,
    ApiInfo,
    BaseInput,
    ToggleFormArea,
  },

  computed: {
    ...mapState(useConfigurationStore, [
      "providers_openaiCompat_baseUrl",
      "providers_openaiCompat_apiKey",
      "providers_openaiCompat_headers",
      "providers_ollama_baseUrl",
      "providers_ollama_headers",
    ]),
    ...mapState(useChatStore, ["errors"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    ...mapActions(useChatStore, ["syncProvider"]),
    handleChange(_event: Event, provider: AvailableProvidersWithDynamicModels) {
      this.syncProvider(provider);
    },
  },
};
</script>
