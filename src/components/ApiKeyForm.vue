<template>
  <div class="api-key-container">
    <div class="api-key-form-wrapper">
      <h1>AI Shell</h1>
      <p>Enter your API key below to start chatting with the AI:</p>
      <form class="api-key-form" @submit.prevent.stop="submitApiKey">
        <div class="provider-selection">
          <label for="provider-select">Choose your AI provider:</label>
          <select
            id="provider-select"
            v-model="selectedProviderId"
            :disabled="disabled"
            required
          >
            <option value="" disabled selected hidden>
              Please choose an AI provider
            </option>
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
          :disabled="disabled"
          :placeholder="`Enter your ${selectedProviderName} API key here`"
          required
        />
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        <button class="btn btn-primary" type="submit" :disabled="disabled">
          {{ messages.length > 0 ? "Continue Chatting" : "Start Chatting" }}
        </button>
      </form>
      <div class="api-info">
        <p>
          Your API key is stored only on your device and is never shared with
          any server except the selected AI provider.
        </p>
        <p v-if="selectedProviderId === 'anthropic'">
          Need a Claude API key?
          <a
            href="https://docs.anthropic.com/en/api/overview#accessing-the-api"
            @click.prevent="$openExternal($event.target.href)"
            >See the docs</a
          >.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Providers, ProviderId } from "@/providers";
import { mapState } from "pinia";
import { useChatStore } from "@/stores/chat";
import { useInternalDataStore } from "@/stores/internalData";
import { useConfigurationStore } from "@/stores/configuration";

export default {
  name: "ApiKeyForm",

  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      apiKey: "",
      selectedProviderId: "" as ProviderId | "",
    };
  },

  computed: {
    ...mapState(useChatStore, ["messages"]),
    ...mapState(useInternalDataStore, ["lastUsedProviderId"]),
    ...mapState(useConfigurationStore, [
      "providers.anthropic.apiKey",
      "providers.google.apiKey",
    ]),
    providers() {
      return Providers;
    },
    selectedProviderName() {
      return (
        this.providers.find((p) => p.id === this.selectedProviderId)
          ?.displayName || ""
      );
    },
  },

  watch: {
    selectedProviderId() {
      if (this.selectedProviderId) {
        this.apiKey = this[`providers.${this.selectedProviderId}.apiKey`];
      }
    },
  },

  methods: {
    submitApiKey() {
      if (this.apiKey.trim()) {
        this.$emit("submit", {
          key: this.apiKey.trim(),
          provider: this.selectedProviderId,
        });
      }
    },
  },

  mounted() {
    this.selectedProviderId = this.lastUsedProviderId;
  },
};
</script>
