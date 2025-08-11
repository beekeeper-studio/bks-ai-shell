<template>
  <div class="shell-app">
    <div v-if="page === 'starting'" v-show="showLoading" class="not-ready">
      <h1>AI Shell</h1>
      <div class="progress-bar"></div>
    </div>
    <OnboardingScreen v-if="page === 'onboarding'" @submit="submitOnboardingScreen" />
    <ChatInterface v-else-if="page === 'chat-interface'" :initialMessages="messages" :openaiApiKey="openaiApiKey"
      :anthropicApiKey="anthropicApiKey" :googleApiKey="googleApiKey" @manage-models="page = 'configuration'" />
    <div id="configuration-page" v-else>
      <Configuration @close="page = 'chat-interface'" />
    </div>
  </div>
</template>

<script lang="ts">
import ChatInterface from "./components/ChatInterface.vue";
import { useChatStore } from "@/stores/chat";
import { useConfigurationStore } from "@/stores/configuration";
import { useInternalDataStore } from "@/stores/internalData";
import { useTabState } from "@/stores/tabState";
import { mapState, mapActions, mapGetters } from "pinia";
import Configuration from "@/components/configuration/Configuration.vue";
import OnboardingScreen from "./components/OnboardingScreen.vue";

type Page = "starting" | "onboarding" | "chat-interface" | "configuration";

export default {
  components: {
    ChatInterface,
    Configuration,
    OnboardingScreen,
  },

  data() {
    return {
      page: "starting" as Page,
      error: "" as unknown,
      showLoading: false,
      apiKeysChanged: false,
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

      if (this.isFirstTimeUser && this.apiKeyExists) {
        this.page = "chat-interface";
      } else if (this.isFirstTimeUser) {
        this.page = "onboarding";
      } else {
        this.page = "chat-interface";
      }
    } catch (e) {
      this.page = "configuration";
      this.error = e;
    } finally {
      clearTimeout(loadingTimer);
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
    ...mapGetters(useInternalDataStore, ["isFirstTimeUser"]),
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    ...mapActions(useInternalDataStore, ["setInternal"]),
    ...mapActions(useChatStore, ["initialize"]),
    submitOnboardingScreen() {
      this.page = "chat-interface";
      this.setInternal("isFirstTimeUser", false);
    },
  },
};
</script>
