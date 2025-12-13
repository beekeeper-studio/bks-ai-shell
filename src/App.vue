<template>
  <div class="shell-app">
    <div v-if="page === 'starting'" v-show="showLoading" class="not-ready">
      <h1>AI Shell</h1>
      <div class="progress-bar"></div>
    </div>
    <ChatInterface v-if="page === 'chat-interface'" :initialMessages="messages" :openaiApiKey="openaiApiKey"
      :anthropicApiKey="anthropicApiKey" :googleApiKey="googleApiKey" @manage-models="handleManageModels"
      @open-configuration="handleOpenConfiguration" />
    <Configuration v-model:visible="showConfiguration" :reactivePage="configurationPage" @close="closeConfiguration" />
    <Dialog :visible="showOnboarding" :closable="false" :draggable="false">
      <OnboardingScreen @submit="closeOnboardingScreen"
        @open-provider-config="closeOnboardingScreenAndOpenProviderConfig" />
    </Dialog>
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
import { getData, log } from "@beekeeperstudio/plugin";
import { Dialog } from "primevue";

type Page = "starting" | "chat-interface";

export default {
  components: {
    ChatInterface,
    Configuration,
    OnboardingScreen,
    Dialog,
  },

  data() {
    return {
      page: "starting" as Page,
      showOnboarding: false,
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
    }, 500);

    await this.reloadWhenStuck();

    try {
      await this.initialize();
      await this.$nextTick();

      if (this.isFirstTimeUser && !this.apiKeyExists) {
        this.showOnboarding = true;
      }

      this.page = "chat-interface";

    } catch (e) {
      this.showConfiguration = true;
      this.error = e;
      log.error(e);
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
    closeOnboardingScreen() {
      this.showOnboarding = false;
      this.page = "chat-interface";
      this.setInternal("isFirstTimeUser", false);
    },
    async closeOnboardingScreenAndOpenProviderConfig() {
      this.closeOnboardingScreen();
      this.openModelsConfig();
      await this.$nextTick();
      const apiKeys = document.querySelector("#providers-configuration-api-keys");
      apiKeys?.scrollIntoView();
    },
    openModelsConfig() {
      this.configurationPage = "models";
      this.showConfiguration = true;
    },
    handleManageModels() {
      this.openModelsConfig();
    },
    handleOpenConfiguration() {
      this.configurationPage = "general";
      this.showConfiguration = true;
    },
    closeConfiguration() {
      this.showConfiguration = false;
    },
    // In Beekeeper Studio v5.3.3 and lower, the requests from plugins are
    // sometimes not responded due to a race condition.
    // See https://github.com/beekeeper-studio/beekeeper-studio/pull/3473
    async reloadWhenStuck() {
      // Track current minute for resetting attempts each minute
      const currentMinute = Math.floor(Date.now() / 60000);
      const storedData = JSON.parse(localStorage.getItem('reloadData') || '{"attempts": 0, "minute": 0}');

      // Reset attempts if we're in a new minute, otherwise use stored attempts
      let attempts = storedData.minute === currentMinute ? storedData.attempts : 0;
      // Incremental delay: 1s, 2s, 3s, 4s, 5s (max)
      const reloadDelay = Math.min(1000 + (attempts * 1000), 5000);

      const reloadTimer = setTimeout(() => {
        // Store incremented attempts for next reload
        localStorage.setItem('reloadData', JSON.stringify({
          attempts: attempts + 1,
          minute: currentMinute
        }));
        window.location.reload();
      }, reloadDelay);
      try {
        await getData();
      } catch (e) {
      } finally {
        // Cancel reload if getData() succeeds or fails quickly
        clearTimeout(reloadTimer);
      }
    },
  },
};
</script>
