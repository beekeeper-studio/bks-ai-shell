<template>
  <div class="onboarding-screen">
    <h1>Welcome to the AI Shell</h1>
    <p>
      Your AI agent can explore your database and (with your permission) write code to
      answer your questions. Enter the API key below for your preffered agent to get started.
    </p>
    <p>
      <ExternalLink href="https://docs.beekeeperstudio.io/user_guide/sql-ai-shell/">Learn more</ExternalLink>
      -
      <ExternalLink href="https://www.youtube.com/watch?v=pAhQUFDeiwc">60s Walkthough Video</ExternalLink>
    </p>
    <form @submit.prevent="$emit('submit')">
      <ApiKeyForm dropdown-based @change="changed = true" @change-provider="$event === 'ollama' && (changed = true)" />
      <div class="actions">
        <button class="btn btn-primary continue-btn" type="submit" :disabled="!changed">
          Get started
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";
import ExternalLink from "@/components/common/ExternalLink.vue";

export default {
  emits: ["submit", "open-provider-config"],

  components: {
    ApiKeyForm,
    ApiInfo,
    ExternalLink,
  },

  data() {
    return {
      changed: false,
    };
  },
};
</script>
