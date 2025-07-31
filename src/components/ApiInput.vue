<template>
  <div class="api-input">
    <label :for="inputId">
      {{ displayName }}
    </label>
    <div class="input-wrapper">
      <input type="password" :id="inputId" :placeholder="`Your ${displayName} API key`" :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)" />
      <span class="helper-text" v-if="helperLink">
        You can get your
        <external-link :href="helperLink">API key here</external-link>.
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { providerConfigs } from "@/config";
import { PropType } from "vue";
import ExternalLink from "./common/ExternalLink.vue";

export default {
  name: "ApiInput",

  components: {
    ExternalLink,
  },

  props: {
    providerId: {
      type: String as PropType<keyof typeof providerConfigs>,
      required: true,
    },
    /** The link to get the API key */
    helperLink: String,
    modelValue: String,
  },

  emits: ["update:modelValue"],

  data() {
    return {
      apiKey: "",
    };
  },

  computed: {
    inputId() {
      return `${this.providerId}-api-input`;
    },
    displayName() {
      return providerConfigs[this.providerId].displayName;
    },
  },
};
</script>
