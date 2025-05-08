<template>
  <div class="assistant-app">
    <!-- API Key Form -->
    <ApiKeyForm
      v-if="page === 'api-key-form'"
      :initial-provider-id="providerId"
      :initial-api-key="apiKey"
      @submit="handleApiKeySubmit"
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
      // page: "chat-interface", // 'api-key-form' or 'chat-interface'
    };
  },

  computed: {
    ...mapState(useProviderStore, ["providerId", "apiKey"]),
  },

  methods: {
    ...mapActions(useProviderStore, ["setApiKey", "setProvider"]),
    async handleApiKeySubmit(data) {
      this.setApiKey(data.key);
      this.setProvider(data.provider);
      this.page = "chat-interface";
    },
  },
};
</script>
