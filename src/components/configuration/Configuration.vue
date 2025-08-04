<template>
  <div class="configuration">
    <nav>
      <ul>
        <li>
          <button class="btn btn-flat nav-button" :class="{ active: page === 'models' }" @click="page = 'models'">
            Models
          </button>
        </li>
        <li>
          <button class="btn btn-flat nav-button" :class="{ active: page === 'providers' }" @click="page = 'providers'">
            Providers
          </button>
        </li>
      </ul>
    </nav>
    <div class="content" :class="page">
      <ModelsConfiguration v-if="page === 'models'" />
      <ProvidersConfiguration v-else-if="page === 'providers'" />
    </div>
  </div>
</template>

<script lang="ts">
import { AvailableProviders, AvailableModels, providerConfigs } from "@/config";
import { useChatStore } from "@/stores/chat";
import { mapActions, mapState } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";
import ModelsConfiguration from "@/components/configuration/ModelsConfiguration.vue";
import ProvidersConfiguration from "@/components/configuration/ProvidersConfiguration.vue";

export default {
  name: "Configuration",

  components: {
    ModelsConfiguration,
    ProvidersConfiguration,
  },

  data() {
    return {
      page: "models" as "models" | "providers",
    };
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
