<template>
  <div class="shell-app">
    <!-- API Key Form -->
    <ApiKeyForm
      v-if="page === 'api-key-form'"
      :initial-provider-id="activeProviderId"
      :initial-api-key="providers[activeProviderId].apiKey"
      @submit="handleApiKeySubmit"
      :disabled="disabledApiKeyForm"
      :error="error"
    />

    <!-- Chat Interface -->
    <ChatInterface
      v-else-if="page === 'chat-interface'"
      @navigate-to-api-form="page = 'api-key-form'"
    />
  </div>
</template>

<script lang="ts">
import ApiKeyForm from "./components/ApiKeyForm.vue";
import ChatInterface from "./components/ChatInterface.vue";
import { useChatStore } from "@/stores/chat";
import { useConfigurationStore } from "@/stores/configuration";
import { mapState, mapActions } from "pinia";
import { ProviderId } from "@/providers";

export default {
  components: {
    ApiKeyForm,
    ChatInterface,
  },

  data() {
    return {
      page: "", // Will be set in mounted based on API key availability
      disabledApiKeyForm: false,
      error: "" as unknown,
    };
  },

  async mounted() {
    // Check if API key exists and auto-navigate to appropriate page
    if (this.providers[this.activeProviderId].apiKey) {
      try {
        await this.initializeProvider();
        this.page = "chat-interface";
      } catch (e) {
        // If initialization fails, go to API key form
        this.page = "api-key-form";
        this.error = e;
      }
    } else {
      this.page = "api-key-form";
    }
  },

  computed: {
    ...mapState(useConfigurationStore, ["activeProviderId", "providers"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    ...mapActions(useChatStore, ["initializeProvider"]),
    async handleApiKeySubmit(data: { key: string; provider: ProviderId }) {
      this.error = "";
      this.disabledApiKeyForm = true;
      await this.$nextTick();
      this.configure(`providers.${data.provider}.apiKey` as const, data.key);
      this.configure("activeProviderId", data.provider);
      try {
        await this.initializeProvider();
        this.page = "chat-interface";
      } catch (e) {
        this.error = e;
      }
      this.disabledApiKeyForm = false;
    },
  },
};
</script>
