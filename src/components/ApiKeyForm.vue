<template>
  <div class="api-key-container">
    <div class="api-key-form-wrapper">
      <h1>AI Assistant</h1>
      <p>Enter your API key below to start chatting with the AI:</p>
      <form class="api-key-form" @submit.prevent.stop="submitApiKey">
        <div class="provider-selection">
          <label for="provider-select">Choose your AI provider:</label>
          <select id="provider-select" v-model="selectedProviderId">
            <option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.displayName }}
            </option>
          </select>
        </div>
        <input
          type="password"
          v-model="apiKey"
          :placeholder="`Enter your ${selectedProviderName} API key here`"
          :required="requireApiKey"
        />
        <button class="btn btn-primary" type="submit">Start Chatting</button>
      </form>
      <div class="api-info">
        <p>
          Your API key is stored only on your device and is never shared with
          any server except the selected AI provider.
        </p>
        <p v-if="selectedProviderId === 'claude'">
          Don't have a Claude API key?
          <a
            href="https://console.anthropic.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            >Get one here</a
          >.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { Providers, ProviderId } from "../providers";

export default {
  name: "ApiKeyForm",

  props: {
    initialProviderId: {
      type: String as PropType<ProviderId>,
      default: "",
    },
    initialApiKey: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      apiKey: this.initialApiKey,
      selectedProviderId: this.initialProviderId,
    };
  },

  computed: {
    providers() {
      return Providers;
    },
    selectedProviderName() {
      return (
        this.providers.find((p) => p.id === this.selectedProviderId)?.label ||
        ""
      );
    },
    requireApiKey() {
      return this.selectedProviderId !== "mock";
    },
  },

  methods: {
    submitApiKey() {
      if (this.apiKey.trim() || !this.requireApiKey) {
        this.$emit("submit", {
          key: this.apiKey.trim(),
          provider: this.selectedProviderId,
        });
      }
    },
  },
};
</script>
