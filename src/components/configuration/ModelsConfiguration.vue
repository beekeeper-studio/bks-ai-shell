<template>
  <h2>Models</h2>
  <BaseInput v-model="filter" placeholder="Search models..." />
  <select
    v-model="filterByProvider"
    :options="filterByProviderOptions"
    class="filter-by-provider"
  >
    <option v-for="option in filterByProviderOptions" :value="option.value">
      {{ option.label }}
    </option>
  </select>
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
      >
        {{ model.displayName }}
        <Switch
          :model-value="model.enabled"
          @change="toggle(model, $event)"
          :disabled="!model.available"
        />
      </label>
      <button
        class="btn delete-btn"
        @click.prevent="remove(model)"
        v-if="model.removable"
      >
        <span class="material-symbols-outlined">delete</span>
      </button>
    </li>
  </ul>
</template>

<script lang="ts">
import { AvailableProviders, providerConfigs } from "@/config";
import Switch from "@/components/common/Switch.vue";
import { Model, useChatStore } from "@/stores/chat";
import { mapActions, mapState, mapWritableState } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";
import _ from "lodash";
import { matchModel } from "@/utils";
import BaseInput from "../common/BaseInput.vue";
import Fuse from "fuse.js";
import Select from "primevue/select";

export default {
  name: "ModelsConfiguration",

  components: {
    Switch,
    BaseInput,
    Select,
  },

  data() {
    return {
      filter: "",
      filterByProvider: "all",
    };
  },

  computed: {
    ...mapState(useChatStore, ["models"]),
    ...mapWritableState(useChatStore, ["model"]),
    ...mapState(useConfigurationStore, ["disabledModels"]),
    fuse() {
      return new Fuse(this.allModels, { keys: ["provider", "id"] });
    },
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
      return this.fuse.search(this.filter).map((result) => result.item);
    },
    filterByProviderOptions() {
      const providers = Object.keys(providerConfigs) as AvailableProviders[];
      return [
        { label: "All providers", value: "all" },
        ...providers.map((provider) => ({
          label: providerConfigs[provider].displayName,
          value: provider,
        })),
      ];
    },
  },

  methods: {
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
          this.model = model;
        }
      } else {
        this.disableModel(model.provider, model.id);
        if (matchModel(model, this.model)) {
          this.model = this.models.find((m) => m.enabled);
        }
      }
    },
    remove(model: Model) {
      this.removeModel(model.provider, model.id);
    },
  },
};
</script>

<style scoped>
.filter-by-provider {
  margin-inline: 0.5rem;
  /* margin-top: 0.1rem; */
  margin-bottom: 0.4rem;
  width: auto;

  .p-select-label {
    font-size: 0.875rem;
  }
}

.empty-state {
  margin-block: 0.5rem;
  color: var(--text);
}
</style>
