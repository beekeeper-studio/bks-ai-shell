<template>
  <div class="shell-app">
    <!-- API Key Form -->
    <ApiKeyForm
      v-if="page === 'api-key-form'"
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
import { useInternalDataStore } from "@/stores/internalData";
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
    await this.initializeChat();

    const configuration = useConfigurationStore()
    const apiKey = configuration[`providers.${this.lastUsedProviderId}.apiKey`] ?? "";

    // Check if API key exists and auto-navigate to appropriate page
    if (apiKey && this.lastUsedProviderId) {
      try {
        await this.initializeProvider(this.lastUsedProviderId, apiKey);
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
    ...mapState(useInternalDataStore, ["lastUsedProviderId"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    ...mapActions(useInternalDataStore, ["setInternal"]),
    ...mapActions(useChatStore, ["initializeChat", "initializeProvider"]),
    async handleApiKeySubmit(data: { key: string; provider: ProviderId }) {
      this.error = "";
      this.disabledApiKeyForm = true;
      await this.$nextTick();
      try {
        await this.initializeProvider(data.provider, data.key);
        this.page = "chat-interface";
      } catch (e) {
        this.error = e;
      }
      this.disabledApiKeyForm = false;
    },
  },
};
</script>
