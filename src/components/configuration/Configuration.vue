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
        <li v-for="{id, displayName} in pages" :key="id">
          <button class="btn btn-flat nav-btn" :class="{ active: page === id }"
            @click="page = id">
            {{ displayName }}
          </button>
        </li>
      </ul>
    </nav>
    <div class="content" :class="page">
      <template v-if="page === 'models'">
        <ModelsConfiguration />
        <ProvidersConfiguration />
      </template>
      <GeneralConfiguration v-if="page === 'general'" />
      <AboutConfiguration v-if="page === 'about'" />
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
import BaseInput from "../common/BaseInput.vue";
import GeneralConfiguration from "./GeneralConfiguration.vue";
import AboutConfiguration from "./AboutConfiguration.vue";
import { PropType } from "vue";

const pages = [
  {
    id: "general",
    displayName: "General",
  },
  {
    id: "models",
    displayName: "Models",
  },
  {
    id: "about",
    displayName: "About",
  },
] as const;

export type PageId = typeof pages[number]["id"];

export default {
  name: "Configuration",

  components: {
    ModelsConfiguration,
    ProvidersConfiguration,
    BaseInput,
    GeneralConfiguration,
    AboutConfiguration,
  },

  emits: ["close"],

  props: {
    initialPage: {
      type: String as PropType<PageId>,
      default: "general",
    },
  },

  data() {
    return {
      page: this.initialPage,
    };
  },

  computed: {
    ...mapState(useChatStore, ["models"]),
    ...mapState(useConfigurationStore, ["disabledModels"]),
    pages: () => pages,
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
