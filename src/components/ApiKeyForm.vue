<template>
  <div class="api-key-container">
    <div class="api-key-form-wrapper">
      <h1>AI Shell</h1>
      <p>Enter at least one API key to get started</p>
      <form @submit.prevent="submitApiKey" class="api-key-form">
        <div class="input-group">
          <label for="openaiApiKey">
            {{ providerConfigs["openai"].displayName }}
          </label>
          <input
            type="password"
            id="openaiApiKey"
            :placeholder="`Your ${providerConfigs['openai'].displayName} API key`"
            v-model="openaiApiKey"
          />
        </div>
        <div class="input-group">
          <label for="anthropicApiKey">
            {{ providerConfigs["anthropic"].displayName }}
          </label>
          <input
            type="password"
            id="anthropicApiKey"
            :placeholder="`Your ${providerConfigs['anthropic'].displayName} API key`"
            v-model="anthropicApiKey"
          />
        </div>
        <div class="input-group">
          <label for="googleApiKey">
            {{ providerConfigs["google"].displayName }}
          </label>
          <input
            type="password"
            for="googleApiKey"
            :placeholder="`Your ${providerConfigs['google'].displayName} API key`"
            v-model="googleApiKey"
          />
        </div>
        <p class="api-info">
          Your API keys are stored only on your device and are never shared with
          any server except the selected AI providers.
        </p>
        <div class="actions">
          <button
            class="btn"
            v-if="cancelable"
            type="button"
            @click.prevent="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="cancelable && !dirty"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { mapState, mapActions } from "pinia";
import { useChatStore } from "@/stores/chat";
import { useConfigurationStore } from "@/stores/configuration";
import { providerConfigs } from "@/config";

export default {
  name: "ApiKeyForm",

  props: {
    cancelable: {
      type: Boolean,
      default: false,
    },
  },

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
    dirty() {
      return (
        this.openaiApiKey !== this["providers.openai.apiKey"] ||
        this.anthropicApiKey !== this["providers.anthropic.apiKey"] ||
        this.googleApiKey !== this["providers.google.apiKey"]
      );
    },
    providerConfigs() {
      return providerConfigs;
    },
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    ...mapActions(useChatStore, ["syncModels"]),
    handleInput(e) {
      this.dirty = true;
    },
    async submitApiKey() {
      await this.configure("providers.openai.apiKey", this.openaiApiKey);
      await this.configure("providers.anthropic.apiKey", this.anthropicApiKey);
      await this.configure("providers.google.apiKey", this.googleApiKey);
      this.syncModels();
      this.dirty = false;
      this.$emit("submit");
    },
  },

  mounted() {
    this.openaiApiKey = this["providers.openai.apiKey"];
    this.anthropicApiKey = this["providers.anthropic.apiKey"];
    this.googleApiKey = this["providers.google.apiKey"];
  },
};
</script>
