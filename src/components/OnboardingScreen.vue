<template>
  <div class="onboarding-screen">
    <h1>Welcome to the AI Shell</h1>
    <p>
      Your AI agent can explore your database and (with your permission) write
      code to answer your questions. Enter the API key below for your preffered
      agent to get started.
    </p>
    <p>
      <ExternalLink
        href="https://docs.beekeeperstudio.io/user_guide/sql-ai-shell/"
      >
        Learn more
      </ExternalLink>
      -
      <ExternalLink href="https://www.youtube.com/watch?v=pAhQUFDeiwc">
        90s Walkthough Video
      </ExternalLink>
    </p>
    <form @submit.prevent="$emit('submit')">
      <ApiKeyForm
        dropdown-based
        @change="changed = true"
        @change-provider="handleChangeProvider"
      />
      <ApiInfo v-if="providerChanged" />
      <div class="actions">
        <button
          class="btn btn-primary continue-btn"
          type="submit"
          :disabled="!changed"
        >
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
import type { AvailableProviders } from "@/config";

export default {
  emits: ["submit"],

  components: {
    ApiKeyForm,
    ApiInfo,
    ExternalLink,
  },

  data() {
    return {
      changed: false,
      providerChanged: false,
    };
  },

  methods: {
    handleChangeProvider(provider: AvailableProviders) {
      this.providerChanged = true;
      if (provider === "ollama" || provider === "mock") {
        this.changed = true;
      }
    },
  },
};
</script>

<style scoped>
.onboarding-screen {
  h1 {
    font-size: 1.25rem;
    color: var(--text-dark);
  }

  .api-key-form {
    margin-bottom: 0.8rem;
  }

  .api-info {
    margin-top: 0;
    margin-bottom: 0.8rem;
  }
}
</style>
