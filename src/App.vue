<template>
  <div class="shell-app">
    <!-- API Key Form -->
    <ApiKeyForm
      v-if="page === 'api-key-form'"
      :initial-provider-id="providerId"
      :initial-api-key="apiKey"
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

<script>
import ApiKeyForm from "./components/ApiKeyForm.vue";
import ChatInterface from "./components/ChatInterface.vue";
import { useProviderStore } from "./store";
import { mapState, mapActions } from "pinia";

export default {
  components: {
    ApiKeyForm,
    ChatInterface,
  },

  data() {
    return {
      page: "", // Will be set in mounted based on API key availability
      disabledApiKeyForm: false,
      error: "",
    };
  },

  async mounted() {
    // Check if API key exists and auto-navigate to appropriate page
    if (this.apiKey && this.providerId) {
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
    ...mapState(useProviderStore, ["providerId", "apiKey"]),
  },

  methods: {
    ...mapActions(useProviderStore, [
      "setApiKey",
      "setProviderId",
      "initializeProvider",
    ]),
    async handleApiKeySubmit(data) {
      this.error = "";
      this.disabledApiKeyForm = true;
      await this.$nextTick()
      this.setApiKey(data.key);
      this.setProviderId(data.provider);
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
