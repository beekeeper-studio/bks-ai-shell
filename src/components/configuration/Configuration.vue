<template>
  <div class="configuration">
    <nav>
      <ul>
        <li>
          <button class="btn btn-flat nav-button" :class="{ active: true }">
            Models
          </button>
        </li>
      </ul>
    </nav>
    <div class="content">
      <h2>Models</h2>
      <div v-for="provider in modelsByProvider" class="provider">
        <h3>{{ provider.providerDisplayName }}</h3>
        <ul class="model-list">
          <li v-for="model in provider.models" :key="model.id" class="model">
            <label class="switch-label">
              {{ model.id }}
              <Switch :model-value="model.enabled" @change="toggleModel(model.id, $event)" />
            </label>
          </li>
        </ul>
      </div>
      <h2>API Keys</h2>
      <ApiInfo />
      <api-key-form />
    </div>
  </div>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "./ApiInfo.vue";
import { AvailableProviders, AvailableModels, providerConfigs } from "@/config";
import Switch from "../common/Switch.vue";
import { useChatStore } from "@/stores/chat";
import { mapActions, mapState } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";

export default {
  name: "Configuration",

  components: {
    ApiKeyForm,
    ApiInfo,
    Switch,
  },

  computed: {
    ...mapState(useChatStore, ["models"]),
    ...mapState(useConfigurationStore, ["disabledModels"]),
    modelsByProvider(): {
      providerId: AvailableProviders;
      providerDisplayName: (typeof providerConfigs)[AvailableProviders]["displayName"];
      models: ((typeof providerConfigs)[AvailableProviders]["models"][number] & {
        enabled: boolean;
      })[];
    }[] {
      return Object.keys(providerConfigs).map((key) => {
        const providerId = key as AvailableProviders;
        return {
          providerId,
          providerDisplayName: providerConfigs[providerId].displayName,
          models: providerConfigs[providerId].models.map((model) => ({
            ...model,
            enabled: this.models.some((m) => m.id === model.id),
          })) as any,
        };
      });
    },
  },

  methods: {
    ...mapActions(useConfigurationStore, ["configure"]),
    toggleModel(model: AvailableModels["id"], checked?: boolean) {
      if (checked === undefined) {
        checked = !this.disabledModels.includes(model);
      }
      this.configure(
        "disabledModels",
        checked
          ? this.disabledModels.filter((m) => m !== model)
          : [...this.disabledModels, model],
      );
    },
  },
};
</script>
