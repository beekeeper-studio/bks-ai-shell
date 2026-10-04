<template>
  <div class="api-key-form" :class="{ 'dropdown-based': dropdownBased }">
    <div class="form-group" v-if="dropdownBased">
      <label for="select-provider">Provider</label>
      <select
        id="select-provider"
        v-model="selectedProvider"
        placeholder="Select a provider"
      >
        <option value="">Select a provider</option>
        <option
          v-for="option in dropdownOptions"
          :value="option.value"
          :key="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <BaseInput
      v-if="!dropdownBased || selectedProvider === 'openai'"
      type="password"
      placeholder="sk-proj-..."
      v-model="openaiApiKey"
    >
      <template #label>
        {{ dropdownBased ? "API Key" : providerConfigs["openai"].displayName }}
      </template>
      <template #helper>
        Get your
        <ExternalLink href="https://platform.openai.com/account/api-keys">
          API Key here.
        </ExternalLink>
      </template>
    </BaseInput>
    <BaseInput
      v-if="!dropdownBased || selectedProvider === 'anthropic'"
      type="password"
      placeholder="sk-ant-..."
      v-model="anthropicApiKey"
    >
      <template #label>
        {{
          dropdownBased ? "API Key" : providerConfigs["anthropic"].displayName
        }}
      </template>
      <template #helper>
        Get your
        <ExternalLink href="https://console.anthropic.com/settings/keys">
          API Key here.
        </ExternalLink>
      </template>
    </BaseInput>
    <BaseInput
      v-if="!dropdownBased || selectedProvider === 'google'"
      type="password"
      placeholder="AIzaSy..."
      v-model="googleApiKey"
    >
      <template #label>
        {{ dropdownBased ? "API Key" : providerConfigs["google"].displayName }}
      </template>
      <template #helper>
        Get your
        <ExternalLink href="https://aistudio.google.com/app/apikey">
          API Key here.
        </ExternalLink>
      </template>
    </BaseInput>
    <BaseInput
      v-if="!dropdownBased || selectedProvider === 'zai'"
      type="password"
      placeholder="sk-..."
      v-model="zaiApiKey"
    >
      <template #label>
        {{ dropdownBased ? "API Key" : providerConfigs["zai"].displayName }}
      </template>
      <template #helper>
        Get your
        <ExternalLink href="https://z.ai/manage-apikey/apikey-list">
          API Key here.
        </ExternalLink>
      </template>
    </BaseInput>
    <BaseInput
      v-if="!dropdownBased || selectedProvider === 'deepseek'"
      type="password"
      placeholder="sk-..."
      v-model="deepseekApiKey"
    >
      <template #label>
        {{ dropdownBased ? "API Key" : providerConfigs["deepseek"].displayName }}
      </template>
      <template #helper>
        Get your
        <ExternalLink href="https://platform.deepseek.com/api_keys">
          API Key here.
        </ExternalLink>
      </template>
    </BaseInput>
    <template v-if="selectedProvider === 'openaiCompat'">
      <BaseInput v-model="openaiCompatBaseUrl">
        <template #label>Base URL</template>
        <template #helper>
          Base URL for an API service that implements the OpenAI API format
          (e.g., local LLMs, alternative providers).
        </template>
      </BaseInput>
      <BaseInput v-model="openaiCompatApiKey" type="password">
        <template #label>API Key</template>
      </BaseInput>
      <BaseInput v-model="openaiCompatHeaders" type="textarea">
        <template #label>Custom Headers</template>
      </BaseInput>
    </template>
    <template v-if="selectedProvider === 'ollama'">
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
import { mapWritableState } from "pinia";
import {
  useEncryptedSettingsStore,
  useSettingsStore,
} from "@/stores/settings";
import { type AvailableProviders, providerConfigs } from "@/config";
import BaseInput from "./common/BaseInput.vue";
import ExternalLink from "./common/ExternalLink.vue";

export default {
  name: "ApiKeyForm",

  components: {
    BaseInput,
    ExternalLink,
  },

  emits: ["change", "changeProvider"],

  props: {
    dropdownBased: Boolean,
  },

  data() {
    return {
      selectedProvider: "" as AvailableProviders,
    };
  },

  computed: {
    ...mapWritableState(useEncryptedSettingsStore, {
      openaiApiKey: "providers.openai.apiKey",
      anthropicApiKey: "providers.anthropic.apiKey",
      googleApiKey: "providers.google.apiKey",
      zaiApiKey: "providers.zai.apiKey",
      deepseekApiKey: "providers.deepseek.apiKey",
      openaiCompatApiKey: "providers_openaiCompat_apiKey",
    }),
    ...mapWritableState(useSettingsStore, {
      ollamaBaseUrl: "providers_ollama_baseUrl",
      ollamaHeaders: "providers_ollama_headers",
      openaiCompatBaseUrl: "providers_openaiCompat_baseUrl",
      openaiCompatHeaders: "providers_openaiCompat_headers",
    }),
    providerConfigs() {
      return providerConfigs;
    },
    dropdownOptions() {
      return (Object.keys(providerConfigs) as AvailableProviders[])
        .filter((provider) => provider !== "mock")
        .map((provider) => ({
        label: providerConfigs[provider].displayName,
        value: provider,
      }));
    },
  },

  watch: {
    openaiApiKey() {
      this.$emit("change");
    },
    anthropicApiKey() {
      this.$emit("change");
    },
    googleApiKey() {
      this.$emit("change");
    },
    zaiApiKey() {
      this.$emit("change");
    },
    deepseekApiKey() {
      this.$emit("change");
    },
    ollamaBaseUrl() {
      this.$emit("change");
    },
    ollamaHeaders() {
      this.$emit("change");
    },
    openaiCompatBaseUrl() {
      this.$emit("change");
    },
    openaiCompatApiKey() {
      this.$emit("change");
    },
    openaiCompatHeaders() {
      this.$emit("change");
    },
    selectedProvider() {
      this.$emit("changeProvider", this.selectedProvider);
    },
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
