<template>
  <h2>Models</h2>
  <div v-for="provider in modelsByProvider" class="provider">
    <h3>{{ provider.providerDisplayName }}</h3>
    <ul class="model-list">
      <li v-for="model in provider.models" :key="model.id" class="model">
        <label class="switch-label">
          {{ model.id }}
          <Switch :model-value="model.enabled" @change="toggle(model, $event)" />
        </label>
        <button class="btn delete-btn" @click.prevent="remove(model)" v-if="model.removable">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { AvailableProviders, providerConfigs } from "@/config";
import Switch from "@/components/common/Switch.vue";
import { Model, useChatStore } from "@/stores/chat";
import { mapActions, mapState } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";
import _ from "lodash";

type Provider = {
  providerId: AvailableProviders;
  providerDisplayName: (typeof providerConfigs)[AvailableProviders]["displayName"];
  models: Model[];
};

export default {
  name: "ModelsConfiguration",

  components: {
    Switch,
  },

  computed: {
    ...mapState(useChatStore, ["models"]),
    ...mapState(useConfigurationStore, ["disabledModels"]),
    modelsByProvider(): Provider[] {
      const providers: Provider[] = [];
      for (const model of this.models) {
        const provider = providers.find((p) => p.providerId === model.provider);
        if (provider) {
          provider.models.push(model);
        } else {
          providers.push({
            providerId: model.provider,
            providerDisplayName: providerConfigs[model.provider].displayName,
            models: [model],
          });
        }
      }
      return providers;
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
      } else {
        this.disableModel(model.provider, model.id);
      }
    },
    remove(model: Model) {
      this.removeModel(model.provider, model.id);
    },
  },
};
</script>
