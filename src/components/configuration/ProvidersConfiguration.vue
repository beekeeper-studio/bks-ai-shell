<template>
  <h2 id="providers-configuration-api-keys">Providers</h2>
  <form @submit.prevent class="config-form">
    <ApiInfo />
    <api-key-form />
  </form>

  <form @submit.prevent class="config-form">
    <h3>OpenAI Compatible</h3>
    <p class="description">Connect to any service using OpenAI's API format.</p>
    <div
      v-for="(error, index) in openAiCompatibleErrors"
      :key="index"
      class="alert alert-danger"
    >
      <span class="material-symbols-outlined">error_outline</span>
      <span>{{ error }}</span>
    </div>
    <BaseInput
      v-model="providers_openaiCompat_baseUrl"
      @change="handleChange($event, 'openaiCompat')"
    >
      <template #label>URL</template>
      <template #helper>
        Base URL for an API service that implements the OpenAI API format (e.g.,
        local LLMs, alternative providers).
      </template>
    </BaseInput>
    <BaseInput
      type="password"
      v-model="providers_openaiCompat_apiKey"
      @change="handleChange($event, 'openaiCompat')"
    >
      <template #label>API Key</template>
    </BaseInput>
    <BaseInput
      type="textarea"
      v-model="providers_openaiCompat_headers"
      @change="handleChange($event, 'openaiCompat')"
    >
      <template #label>Headers</template>
    </BaseInput>
  </form>

  <form @submit.prevent class="config-form">
    <h3>Ollama</h3>
    <div
      v-for="(error, index) in ollamaErrors"
      :key="index"
      class="alert alert-danger"
    >
      <span class="material-symbols-outlined">error_outline</span>
      <span>
        <template v-if="error.includes('[1]')">
          Ollama is unreachable. It may not be running or CORS may be blocking
          the request. Check out our
          <ExternalLink
            href="https://docs.beekeeperstudio.io/user_guide/sql-ai-shell/#problem-fetching-ollama"
          >
            troubleshooting docs</ExternalLink
          >.
        </template>
        <template v-else>{{ error }}</template>
      </span>
    </div>
    <BaseInput
      v-model="providers_ollama_baseUrl"
      @change="handleChange($event, 'ollama')"
    >
      <template #label>URL</template>
      <template #helper>Ollama server URL.</template>
    </BaseInput>
  </form>
</template>

<script lang="ts">
import ApiKeyForm from "@/components/ApiKeyForm.vue";
import ApiInfo from "@/components/configuration/ApiInfo.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import ToggleFormArea from "../common/ToggleFormArea.vue";
import {
  useEncryptedSettingsStore,
  useSettingsStore,
} from "@/stores/settings";
import { mapState, mapActions, mapWritableState } from "pinia";
import type { AvailableProvidersWithDynamicModels } from "@/config";
import { useChatStore } from "@/stores/chat";
import ExternalLink from "../common/ExternalLink.vue";

export default {
  name: "ProvidersConfiguration",

  components: {
    ApiKeyForm,
    ApiInfo,
    BaseInput,
    ToggleFormArea,
    ExternalLink,
  },

  computed: {
    ...mapWritableState(useSettingsStore, [
      "providers_openaiCompat_baseUrl",
      "providers_openaiCompat_headers",
      "providers_ollama_baseUrl",
      "providers_ollama_headers",
    ]),
    ...mapWritableState(useEncryptedSettingsStore, [
      "providers_openaiCompat_apiKey",
    ]),
    ...mapState(useChatStore, ["errors"]),
    openAiCompatibleErrors() {
      return this.errors
        .filter(
          (error) =>
            error.providerId === "openaiCompat" &&
            !error.message.includes("[2]"),
        )
        .map((error) => error.message);
    },
    ollamaErrors() {
      return this.errors
        .filter(
          (error) =>
            error.providerId === "ollama" && !error.message.includes("[2]"),
        )
        .map((error) => error.message);
    },
  },

  methods: {
    ...mapActions(useChatStore, ["syncProvider"]),
    handleChange(_event: Event, provider: AvailableProvidersWithDynamicModels) {
      this.syncProvider(provider);
    },
  },
};
</script>

<style scoped>
h2 {
  margin-top: 2rem;
}

.config-form {
  .api-key-form {
    gap: 0;
  }

  > .form-group {
    label {
      width: 7rem;
      margin-top: 0.6rem;
      flex-shrink: 0;
    }

    .input-wrapper {
      flex-grow: 1;
    }
  }

  .toggle-form-area {
    margin-top: 1rem;

    .toggle-btn {
      margin-left: -0.5rem;
    }

    .key-value-list-input label {
      display: none;
    }

    h4 {
      margin: 0;
      font-weight: normal;
    }
  }
}

.config-form :deep(.form-group) {
  display: grid;
  grid-template-columns: 1fr 3fr;

  label {
    width: 7rem;
    flex-shrink: 0;
  }

  .input-wrapper {
    grid-column: 2;
    grid-row: 1;
  }

  .helper {
    grid-column: 2;
    grid-row: 2;
  }
}
</style>
