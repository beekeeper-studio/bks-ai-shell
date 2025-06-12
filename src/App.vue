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
    <ChatInterface v-else-if="page === 'chat-interface'" />
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
      page: "api-key-form", // 'api-key-form' or 'chat-interface'
      disabledApiKeyForm: false,
      error: "",
    };
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
