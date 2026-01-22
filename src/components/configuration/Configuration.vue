<template>
  <Dialog class="configuration" @update:visible="$emit('update:visible', $event)" :visible="visible" dismissable-mask
    :show-header="false" modal>
    <nav>
      <ul>
        <li>
          <button class="btn btn-flat nav-btn close-btn" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </li>
        <li v-for="{ id, displayName } in pages" :key="id">
          <button class="btn btn-flat nav-btn" :class="{ active: page === id }" @click="page = id">
            {{ displayName }}
          </button>
        </li>
      </ul>
    </nav>
    <div class="content" :class="page">
      <GeneralConfiguration v-if="page === 'general'" />
      <ModelsConfiguration v-if="page === 'models'"/>
      <ProvidersConfiguration v-if="page === 'providers'"/>
      <AboutConfiguration v-if="page === 'about'" />
    </div>
  </Dialog>
</template>

<script lang="ts">
import ModelsConfiguration from "@/components/configuration/ModelsConfiguration.vue";
import ProvidersConfiguration from "@/components/configuration/ProvidersConfiguration.vue";
import GeneralConfiguration from "./GeneralConfiguration.vue";
import AboutConfiguration from "./AboutConfiguration.vue";
import { PropType } from "vue";
import { Dialog } from "primevue";

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
    id: "providers",
    displayName: "Providers",
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
    GeneralConfiguration,
    AboutConfiguration,
    Dialog,
  },

  emits: ["close", "update:visible"],

  props: {
    closable: Boolean,
    visible: Boolean,
    reactivePage: {
      type: String as PropType<PageId>,
      default: "general",
    },
  },

  data() {
    return {
      page: this.reactivePage,
    };
  },

  computed: {
    pages: () => pages,
  },

  watch: {
    reactivePage() {
      this.page = this.reactivePage;
    },
  },
};
</script>
