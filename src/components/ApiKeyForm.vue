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
          >
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
          :required="requireApiKey"
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
        <p v-if="selectedProviderId === 'claude'">
          Need a Claude API key?
          <a
            href="https://docs.anthropic.com/en/api/overview#accessing-the-api"
            @click.prevent="$request('openExternal', { link: $event.target.href })"
            >See the docs</a
          >.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { Providers, ProviderId } from "@/providers";
import { BaseProvider } from "@/providers/BaseProvider";
import { mapState } from "pinia";
import { useProviderStore } from "@/stores/provider";

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
      apiKey: this.initialApiKey,
      selectedProviderId: this.initialProviderId,
    };
  },

  computed: {
    ...mapState(useProviderStore, [
      'messages',
    ]),
    providers(): (typeof BaseProvider)[] {
      const providers = Object.keys(Providers).map((key) => Providers[key]);
      if (import.meta.env.MODE === "development") {
        return providers;
      }
      return providers.filter((p) => p.id !== "mock");
    },
    selectedProviderName() {
      return (
        this.providers.find((p) => p.id === this.selectedProviderId)?.displayName ||
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
