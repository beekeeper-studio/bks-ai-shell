<template>
  <div class="api-key-form">
    <BaseInput
      type="password"
      placeholder="sk-proj-..."
      v-model="openaiApiKey"
    >
      <template #label>
        {{ providerConfigs["openai"].displayName }}
      </template>
      <template #helper>
        Get your <ExternalLink href="https://platform.openai.com/account/api-keys">API Key here.</ExternalLink>
      </template>
    </BaseInput>
    <BaseInput
      type="password"
      placeholder="sk-ant-..."
      v-model="anthropicApiKey"
    >
      <template #label>
        {{ providerConfigs["anthropic"].displayName }}
      </template>
      <template #helper>
        Get your <ExternalLink href="https://console.anthropic.com/settings/keys">API Key here.</ExternalLink>
      </template>
    </BaseInput>
    <BaseInput
      type="password"
      placeholder="AIzaSy..."
      v-model="googleApiKey"
    >
      <template #label>
        {{ providerConfigs["google"].displayName }}
      </template>
      <template #helper>
        Get your <ExternalLink href="https://aistudio.google.com/app/apikey">API Key here.</ExternalLink>
      </template>
    </BaseInput>
  </div>
</template>

<script lang="ts">
import { mapState, mapActions } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";
import { providerConfigs } from "@/config";
import BaseInput from "./common/BaseInput.vue";
import ExternalLink from "./common/ExternalLink.vue";

export default {
  name: "ApiKeyForm",

  components: {
    BaseInput,
    ExternalLink,
  },

  emits: ["change"],

  data() {
    return {
      openaiApiKey: "",
      anthropicApiKey: "",
      googleApiKey: "",
    };
  },

  computed: {
    ...mapState(useConfigurationStore, [
      "providers.openai.apiKey",
      "providers.anthropic.apiKey",
      "providers.google.apiKey",
    ]),
    providerConfigs() {
      return providerConfigs;
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
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
  },

  mounted() {
    this.openaiApiKey = this["providers.openai.apiKey"];
    this.anthropicApiKey = this["providers.anthropic.apiKey"];
    this.googleApiKey = this["providers.google.apiKey"];
  },
};
</script>
