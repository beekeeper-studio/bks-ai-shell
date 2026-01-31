<template>
  <Dialog
    modal
    dismissable-mask
    close-on-escape
    class="configuration"
    :visible="visible"
    :show-header="false"
    @update:visible="updateVisible"
  >
    <nav>
      <ul>
        <li>
          <button
            class="btn btn-flat nav-btn close-btn"
            @click="updateVisible(false)"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </li>
        <li v-for="{ id, displayName } in pages" :key="id">
          <button
            class="btn btn-flat nav-btn"
            :class="{ active: page === id }"
            @click="page = id"
          >
            {{ displayName }}
          </button>
        </li>
      </ul>
    </nav>
    <div class="content" :class="page">
      <div v-if="storeStatus === 'loading'">Loading...</div>
      <div v-else-if="storeStatus === 'error'">Error: {{ storeError }}</div>
      <GeneralConfiguration
        v-else-if="page === 'general'"
        @update:dirty="isDirty = $event"
      />
      <ModelsConfiguration v-else-if="page === 'models'" />
      <ProvidersConfiguration v-else-if="page === 'providers'" />
      <AboutConfiguration v-else-if="page === 'about'" />
    </div>
  </Dialog>
</template>

<script lang="ts">
import GeneralConfiguration from "./GeneralConfiguration.vue";
import ModelsConfiguration from "@/components/configuration/ModelsConfiguration.vue";
import ProvidersConfiguration from "@/components/configuration/ProvidersConfiguration.vue";
import AboutConfiguration from "./AboutConfiguration.vue";
import { PropType } from "vue";
import { Dialog } from "primevue";
import { mapState } from "pinia";
import { useConfigurationStore } from "@/stores/configuration";

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

export type PageId = (typeof pages)[number]["id"];

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
      isDirty: false,
    };
  },

  computed: {
    pages: () => pages,
    ...mapState(useConfigurationStore, ["storeStatus", "storeError"]),
  },

  watch: {
    reactivePage() {
      this.page = this.reactivePage;
    },
  },

  methods: {
    updateVisible(visible: boolean) {
      if (!visible && this.isDirty) {
        this.trigger("dialogClosePrevented");
        return;
      }
      this.$emit("update:visible", visible);
    }
  }
};
</script>
