<template>
  <div class="api-key-form" :class="{ 'dropdown-based': dropdownBased }">
    <div class="input-container" v-if="dropdownBased">
      <label for="select-provider">Provider</label>
      <Select for="select-provider" v-model="selectedProvider" :options="dropdownOptions" optionLabel="label"
        placeholder="Select a provider" />
    </div>
    <BaseInput v-if="!dropdownBased || selectedProvider.value === 'openai'" type="password" placeholder="sk-proj-..."
      v-model="openaiApiKey">
      <template #label>
        {{ providerConfigs["openai"].displayName }}
        {{ dropdownBased ? "API Key" : '' }}
      </template>
      <template #helper>
        Get your <ExternalLink href="https://platform.openai.com/account/api-keys">API Key here.</ExternalLink>
      </template>
    </BaseInput>
    <BaseInput v-if="!dropdownBased || selectedProvider.value === 'anthropic'" type="password" placeholder="sk-ant-..."
      v-model="anthropicApiKey">
      <template #label>
        {{ providerConfigs["anthropic"].displayName }}
        {{ dropdownBased ? "API Key" : '' }}
      </template>
      <template #helper>
        Get your <ExternalLink href="https://console.anthropic.com/settings/keys">API Key here.</ExternalLink>
      </template>
    </BaseInput>
    <BaseInput v-if="!dropdownBased || selectedProvider.value === 'google'" type="password" placeholder="AIzaSy..."
      v-model="googleApiKey">
      <template #label>
        {{ providerConfigs["google"].displayName }}
        {{ dropdownBased ? "API Key" : '' }}
      </template>
      <template #helper>
        Get your <ExternalLink href="https://aistudio.google.com/app/apikey">API Key here.</ExternalLink>
      </template>
    </BaseInput>
    <template v-if="selectedProvider.value === 'openaiCompat'">
      <BaseInput v-model="openaiCompatApiKey">
        <template #label>OpenAI Compatible API Key</template>
      </BaseInput>
      <BaseInput v-model="openaiCompatBaseUrl">
        <template #label>Base URL</template>
      </BaseInput>
      <BaseInput v-model="openaiCompatHeaders" type="textarea">
        <template #label>Custom Headers</template>
      </BaseInput>
    </template>
    <template v-if="selectedProvider.value === 'ollama'">
      <BaseInput v-model="ollamaBaseUrl">
        <template #label>Ollama Base URL</template>
      </BaseInput>
      <BaseInput v-model="ollamaHeaders" type="textarea">
        <template #label>Custom Headers</template>
      </BaseInput>
    </template>
  </div>
</template>

<script lang="ts">
import { mapActions } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";
import { AvailableProviders, providerConfigs } from "@/config";
import BaseInput from "./common/BaseInput.vue";
import ExternalLink from "./common/ExternalLink.vue";
import Select from 'primevue/select';

export default {
  name: "ApiKeyForm",

  components: {
    BaseInput,
    ExternalLink,
    Select,
  },

  emits: ["change", "changeProvider"],

  props: {
    dropdownBased: Boolean,
  },

  data() {
    const config = useConfigurationStore();

    return {
      selectedProvider: {
        label: "" as typeof providerConfigs[AvailableProviders]['displayName'],
        value: "" as AvailableProviders,
      },
      openaiApiKey: config['providers.openai.apiKey'],
      anthropicApiKey: config['providers.anthropic.apiKey'],
      googleApiKey: config['providers.google.apiKey'],
      ollamaBaseUrl: config.providers_ollama_baseUrl,
      ollamaHeaders: config.providers_ollama_headers,
      openaiCompatBaseUrl: config.providers_openaiCompat_baseUrl,
      openaiCompatApiKey: config.providers_openaiCompat_apiKey,
      openaiCompatHeaders: config.providers_openaiCompat_headers,
    };
  },

  computed: {
    providerConfigs() {
      return providerConfigs;
    },
    dropdownOptions() {
      return Object.keys(providerConfigs).map((provider) => ({
        label: this.providerConfigs[provider].displayName,
        value: provider,
      }));
    },
  },

  watch: {
    openaiApiKey() {
      this.configure("providers.openai.apiKey", this.openaiApiKey);
      this.$emit("change");
    },
    anthropicApiKey() {
      this.configure("providers.anthropic.apiKey", this.anthropicApiKey);
      this.$emit("change");
    },
    googleApiKey() {
      this.configure("providers.google.apiKey", this.googleApiKey);
      this.$emit("change");
    },
    ollamaBaseUrl() {
      this.configure("providers_ollama_baseUrl", this.ollamaBaseUrl);
      this.$emit("change");
    },
    ollamaHeaders() {
      this.configure("providers_ollama_headers", this.ollamaHeaders);
      this.$emit("change");
    },
    openaiCompatBaseUrl() {
      this.configure("providers_openaiCompat_baseUrl", this.openaiCompatBaseUrl);
      this.$emit("change");
    },
    openaiCompatApiKey() {
      this.configure("providers_openaiCompat_apiKey", this.openaiCompatApiKey);
      this.$emit("change");
    },
    openaiCompatHeaders() {
      this.configure("providers_openaiCompat_headers", this.openaiCompatHeaders);
      this.$emit("change");
    },
    selectedProvider() {
      this.$emit("changeProvider", this.selectedProvider.value);
    },
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
  },
};
</script>

<style scoped>
.input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: flex-start;

  label {
    align-self: flex-start;
  }
}
</style>
