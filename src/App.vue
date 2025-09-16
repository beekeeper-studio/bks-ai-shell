<template>
  <div class="shell-app">
    <div v-if="page === 'starting'" v-show="showLoading" class="not-ready">
      <h1>AI Shell</h1>
      <div class="progress-bar"></div>
    </div>
    <OnboardingScreen v-if="page === 'onboarding'" @submit="submitOnboardingScreen" />
    <ChatInterface v-else-if="page === 'chat-interface'" :initialMessages="messages" :openaiApiKey="openaiApiKey"
      :anthropicApiKey="anthropicApiKey" :googleApiKey="googleApiKey" @manage-models="handleManageModels"
      @open-configuration="handleOpenConfiguration" />
    <div id="configuration-popover" :class="{ active: showConfiguration }">
      <Configuration :reactivePage="configurationPage" @close="closeConfiguration" />
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
import Configuration, {
  PageId as ConfigurationPageId,
} from "@/components/configuration/Configuration.vue";
import OnboardingScreen from "./components/OnboardingScreen.vue";
import { notify } from "@beekeeperstudio/plugin";

type Page = "starting" | "onboarding" | "chat-interface";

export default {
  components: {
    ChatInterface,
    Configuration,
    OnboardingScreen,
  },

  data() {
    return {
      page: "starting" as Page,
      showConfiguration: false,
      error: "" as unknown,
      showLoading: false,
      apiKeysChanged: false,
      configurationPage: "general" as ConfigurationPageId,
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
      this.showConfiguration = true;
      this.error = e;
      notify("pluginError", {
        message: `Failed to initialize: ${e?.message || e}`,
        error: e?.name,
        stack: e?.stack,
      });
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
    handleManageModels() {
      this.configurationPage = "models";
      this.showConfiguration = true;
    },
    handleOpenConfiguration() {
      this.configurationPage = "general";
      this.showConfiguration = true;
    },
    closeConfiguration() {
      this.showConfiguration = false;
    },
  },
};
</script>
