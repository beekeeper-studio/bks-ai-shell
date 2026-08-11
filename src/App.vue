<template>
  <div class="shell-app">
    <div v-if="page === 'starting'" v-show="showLoading" class="not-ready">
      <h1>AI Shell</h1>
      <div class="progress-bar"></div>
    </div>
    <ChatInterface v-if="page === 'chat-interface'" :initialMessages="messages" :pendingPrompt="pendingPrompt"
      @manage-models="handleManageModels" @open-configuration="handleOpenConfiguration"
      @prompt-sent="handlePendingPromptSent" />
    <Configuration v-model:visible="showConfiguration" :reactivePage="configurationPage" @close="closeConfiguration" />
    <Dialog modal :visible="showOnboarding" :closable="false" :draggable="false">
      <OnboardingScreen @submit="closeOnboardingScreen" />
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
  type PageId as ConfigurationPageId,
} from "@/components/configuration/Configuration.vue";
import OnboardingScreen from "./components/OnboardingScreen.vue";
import { getData, getViewContext, log } from "@beekeeperstudio/plugin";
import { Dialog } from "primevue";
import { composeHostTaskPrompt, parseHostTask } from "@/utils/hostTask";

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
      /** The prompt for a host-provided task, held until it is actually sent. */
      pendingPrompt: null as string | null,
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

      await this.loadHostTask();

      if (this.isFirstTimeUser && !this.apiKeyExists) {
        this.showOnboarding = true;
      }

      this.page = "chat-interface";

    } catch (e) {
      this.showConfiguration = true;
      this.error = e;
      log.error(e as Error);
    } finally {
      clearTimeout(loadingTimer);
    }
  },

  computed: {
    ...mapState(useTabState, ["messages", "taskConsumed"]),
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
    ...mapActions(useChatStore, ["initialize", "selectDefaultModel"]),
    ...mapActions(useTabState, ["markTaskConsumed"]),

    /**
     * Pick up the task this tab was opened with, if any.
     *
     * The host re-delivers a tab's params on every mount, so `taskConsumed`
     * (persisted in the tab state) is what stops a restart re-running the task
     * and re-billing the user's tokens. The prompt is only held here — it stays
     * pending across first-time setup and is marked consumed at the point it is
     * actually sent.
     */
    async loadHostTask() {
      if (this.taskConsumed) {
        return;
      }

      try {
        const task = parseHostTask(await getViewContext());
        if (task) {
          this.pendingPrompt = composeHostTaskPrompt(task);
        }
      } catch (e) {
        // An older host has no view context. Nothing to do.
        log.error(e as Error);
      }
    },

    handlePendingPromptSent() {
      this.pendingPrompt = null;
      this.markTaskConsumed();
    },

    closeOnboardingScreen() {
      this.showOnboarding = false;
      this.page = "chat-interface";
      this.setInternal("isFirstTimeUser", false);
      // Models only become enabled once an API key is saved, so nothing has
      // been selected up to this point.
      this.selectDefaultModel();
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
