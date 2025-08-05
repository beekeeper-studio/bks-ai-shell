<template>
  <div class="shell-app">
    <div v-if="!appReady" v-show="showLoading" class="not-ready">
      <h1>AI Shell</h1>
      <div class="progress-bar"></div>
    </div>
    <template v-else>
      <div v-if="firstTimeUser" class="first-time-user">
        <h1>AI Shell</h1>
        <p>Enter at least one API key to get started</p>
        <form @submit.prevent="submitFirstTimeUser">
          <ApiKeyForm />
          <ApiInfo />
          <div class="actions">
            <button class="btn btn-primary" type="submit">Continue</button>
          </div>
        </form>
      </div>

      <ChatInterface
        v-else-if="page === 'chat-interface'"
        :initialMessages="messages"
        :openaiApiKey="openaiApiKey"
        :anthropicApiKey="anthropicApiKey"
        :googleApiKey="googleApiKey"
        @manage-models="page = 'configuration'"
      />
      <div id="configuration-page" v-else>
        <Configuration @close="page = 'chat-interface'" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import ApiKeyForm from "./components/ApiKeyForm.vue";
import ChatInterface from "./components/ChatInterface.vue";
import { useChatStore } from "@/stores/chat";
import { useConfigurationStore } from "@/stores/configuration";
import { useInternalDataStore } from "@/stores/internalData";
import { useTabState } from "@/stores/tabState";
import { mapState, mapActions, mapGetters } from "pinia";
import Configuration from "@/components/configuration/Configuration.vue";
import ApiInfo from "./components/configuration/ApiInfo.vue";

export default {
  components: {
    ApiKeyForm,
    ApiInfo,
    ChatInterface,
    Configuration,
  },

  data() {
    return {
      page: "", // Will be set in mounted based on API key availability
      disabledApiKeyForm: false,
      error: "" as unknown,
      appReady: false,
      showLoading: false,
      firstTimeUser: false,
    };
  },

  async mounted() {
    // Show loading bar after 500ms if not ready
    const loadingTimer = setTimeout(() => {
      this.showLoading = true;
    }, 1000);

    try {
      await this.initialize();
      await this.$nextTick();

      const configuration = useConfigurationStore();
      this.firstTimeUser = !configuration.apiKeyExists;
      if (!this.firstTimeUser) {
        this.page = "chat-interface";
      }
    } catch (e) {
      this.page = "configuration";
      this.error = e;
    } finally {
      clearTimeout(loadingTimer);
      this.appReady = true;
    }
  },

  computed: {
    ...mapState(useTabState, ["messages"]),
    ...mapState(useConfigurationStore, {
      openaiApiKey: "providers.openai.apiKey",
      anthropicApiKey: "providers.anthropic.apiKey",
      googleApiKey: "providers.google.apiKey",
    }),
    ...mapGetters(useConfigurationStore, ["apiKeyExists"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    ...mapActions(useInternalDataStore, ["setInternal"]),
    ...mapActions(useChatStore, ["initialize"]),
    submitFirstTimeUser() {
      this.page = "chat-interface";
      this.firstTimeUser = false;
    },
  },
};
</script>
