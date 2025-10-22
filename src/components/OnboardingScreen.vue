<template>
  <div class="onboarding-screen">
    <h1>Welcome to AI Shell</h1>
    <p>Before we start, please enter your API keys below.</p>
    <ApiInfo />
    <form @submit.prevent="$emit('submit')">
      <ApiKeyForm @change="changed = true" />
      <div class="actions">
        <button class="btn btn-primary continue-btn" type="submit">
          {{ changed ? "Continue" : "Skip" }}
        </button>
        <button class="btn btn-flat" type="button" @click="$emit('open-provider-config')">
          More provider options
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";
export default {
  emits: ["submit", "open-provider-config"],

  components: {
    ApiKeyForm,
    ApiInfo,
  },

  data() {
    return {
      changed: false,
    };
  },
};
</script>
