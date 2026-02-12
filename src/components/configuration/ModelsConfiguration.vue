<template>
  <h2>Models</h2>
  <div class="models-content">
    <div class="models-header">
      <BaseInput v-model="filter" placeholder="Search models..." />
      <div class="models-sub-header">
        <select
          v-model="filterByProvider"
          :options="filterByProviderOptions"
          class="filter-by-provider"
        >
          <option
            v-for="option in filterByProviderOptions"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <button
          @click="refreshModels"
          v-show="supportsRuntimeModels"
          class="btn btn-flat"
          :disabled="disableRefreshModelsBtn"
        >
          <span class="material-symbols-outlined">refresh</span>
          Refresh models
        </button>
      </div>
    </div>
    <template v-if="filterByProvider === 'openaiCompat'">
      <div
        v-for="(error, index) in openAiCompatibleErrors"
        :key="index"
        class="alert alert-danger"
      >
        <span class="material-symbols-outlined">error_outline</span>
        <span>{{ error }}</span>
      </div>
    </template>
    <template v-if="filterByProvider === 'ollama'">
      <div
        v-for="(error, index) in ollamaErrors"
        :key="index"
        class="alert alert-danger"
      >
        <span class="material-symbols-outlined">error_outline</span>
        <span>
          <template v-if="error.includes('[1]')">
            Ollama is unreachable. It may not be running or CORS may be blocking
            the request. Check out our
            <ExternalLink
              href="https://docs.beekeeperstudio.io/user_guide/sql-ai-shell/#problem-fetching-ollama"
            >
              troubleshooting docs</ExternalLink
            >.
          </template>
          <template v-else>{{ error }}</template>
        </span>
      </div>
    </template>
    <p class="empty-state" v-if="filteredModels.length === 0">
      No models found
    </p>
    <ul class="model-list">
      <li
        v-for="model in filteredModels"
        :key="model.id"
        class="model"
        :class="{ available: model.available }"
      >
        <label
          class="switch-label"
          :title="
            !model.available
              ? `${model.providerDisplayName} API key is required to enable this model`
              : model.id
          "
          @click="!model.available && showDisabledPopover($event)"
        >
          {{ model.displayName }}
          <Switch
            :model-value="model.enabled"
            @change="toggle(model as Model, $event)"
            :disabled="!model.available"
          />
        </label>
        <button
          class="btn delete-btn"
          @click.prevent="remove(model as Model)"
          v-if="model.removable"
        >
          <span class="material-symbols-outlined">delete</span>
        </button>
      </li>
    </ul>
  </div>
  <Popover ref="disabledPopover">
    API Key is required to enable this model
  </Popover>
</template>

<script lang="ts">
import {
  type AvailableProviders,
  type AvailableProvidersWithDynamicModels,
  providerConfigs,
} from "@/config";
import Switch from "@/components/common/Switch.vue";
import { type Model, useChatStore } from "@/stores/chat";
import { mapActions, mapState, mapWritableState } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";
import _ from "lodash";
import { matchModel, providerSupportsRuntimeModels } from "@/utils";
import BaseInput from "../common/BaseInput.vue";
import Popover from "primevue/popover";
import ExternalLink from "../common/ExternalLink.vue";

export default {
  name: "ModelsConfiguration",

  components: {
    Switch,
    BaseInput,
    Popover,
    ExternalLink,
  },

  data() {
    return {
      filter: "",
      filterByProvider: "all" as "all" | AvailableProviders,
      syncingProviders: [] as AvailableProvidersWithDynamicModels[],
    };
  },

  computed: {
    ...mapState(useChatStore, ["models", "errors"]),
    ...mapWritableState(useChatStore, ["model"]),
    ...mapState(useConfigurationStore, ["disabledModels"]),
    sortedModels() {
      // Enabled models first
      return this.models.sort((a, b) => {
        if (a.enabled === b.enabled) {
          return 0;
        }
        return a.enabled ? -1 : 1;
      });
    },
    allModels() {
      if (this.filterByProvider === "all") {
        return this.sortedModels;
      }
      return this.sortedModels.filter(
        (model) => model.provider === this.filterByProvider,
      );
    },
    filteredModels() {
      if (!this.filter.trim()) {
        return this.allModels;
      }
      return this.allModels.filter((model) =>
        model.displayName.toLowerCase().includes(this.filter.toLowerCase()),
      );
    },
    filterByProviderOptions() {
      const providers = (
        Object.keys(providerConfigs) as AvailableProviders[]
      ).filter(
        (provider) =>
          import.meta.env.MODE === "development" || provider !== "mock",
      );
      return [
        { label: "All providers", value: "all" },
        ...providers.map((provider) => ({
          label: providerConfigs[provider].displayName,
          value: provider,
        })),
      ];
    },
    supportsRuntimeModels() {
      return providerSupportsRuntimeModels(this.filterByProvider);
    },
    disableRefreshModelsBtn() {
      return (
        this.filterByProvider !== "all" &&
        this.syncingProviders.includes(this.filterByProvider as AvailableProvidersWithDynamicModels)
      );
    },
    // FIXME: Duplicated from ProvidersConfiguration
    openAiCompatibleErrors() {
      return this.errors
        .filter(
          (error) =>
            error.providerId === "openaiCompat" &&
            !error.message.includes("[2]"),
        )
        .map((error) => error.message);
    },
    // FIXME: Duplicated from ProvidersConfiguration
    ollamaErrors() {
      return this.errors
        .filter(
          (error) =>
            error.providerId === "ollama" && !error.message.includes("[2]"),
        )
        .map((error) => error.message);
    },
  },

  methods: {
    ...mapActions(useChatStore, ["syncProvider"]),
    ...mapActions(useConfigurationStore, [
      "configure",
      "removeModel",
      "enableModel",
      "disableModel",
    ]),
    toggle(model: Model, checked: boolean) {
      if (checked) {
        this.enableModel(model.provider, model.id);
        if (!this.model) {
          this.model = model as Model;
        }
      } else {
        this.disableModel(model.provider, model.id);
        if (matchModel(model, this.model)) {
          this.model = this.models.find((m) => m.enabled) as Model | undefined;
        }
      }
    },
    remove(model: Model) {
      this.removeModel(model.provider, model.id);
    },
    showDisabledPopover(event: MouseEvent) {
      const popover = this.$refs.disabledPopover as InstanceType<typeof Popover>;
      popover.hide();
      this.$nextTick(() => {
        popover.show(event);
      });
    },
    refreshModels() {
      const filterByProvider = this.filterByProvider;
      if (providerSupportsRuntimeModels(filterByProvider)) {
        this.syncingProviders.push(filterByProvider);
        this.syncProvider(filterByProvider).finally(() => {
          this.syncingProviders.splice(
            this.syncingProviders.indexOf(filterByProvider),
            1,
          );
        });
      }
    },
  },
};
</script>

<style scoped>
.models-header {
  position: sticky;
  top: -1px;
  background: var(--p-dialog-background);
  z-index: 1;
  padding-bottom: 0.4rem;
}

.models-sub-header {
  display: flex;
}

.filter-by-provider {
  margin-inline: 0.5rem;
  width: auto;
}

.empty-state {
  margin-block: 0.5rem;
  color: var(--text);
}

.switch-label {
  font-size: 0.831rem;
}
</style>
