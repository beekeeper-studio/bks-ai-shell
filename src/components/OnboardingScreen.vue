<template>
  <div class="onboarding-screen">
    <h1>AI Shell</h1>
    <p>Enter your API key to get started</p>
    <form @submit.prevent="$emit('submit')">
      <ApiKeyForm @change="changed = true" />
      <ApiInfo />
      <div class="actions">
        <button class="btn btn-primary continue-btn" type="submit">
          {{ changed ? "Continue" : "Skip" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";
export default {
  emits: ["submit"],

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
