<template>
  <div class="configuration">
    <nav>
      <ul>
        <li>
          <button class="btn btn-flat nav-btn back-btn" @click="$emit('close')">
            <span class="material-symbols-outlined">keyboard_arrow_left</span>
            Back
          </button>
        </li>
        <li>
          <button class="btn btn-flat nav-btn" :class="{ active: page === 'models' }" @click="page = 'models'">
            Models
          </button>
        </li>
      </ul>
    </nav>
    <div class="content" :class="page">
      <template v-if="page === 'models'">
        <ModelsConfiguration />
        <ProvidersConfiguration />
      </template>
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

  emits: ["close"],

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
