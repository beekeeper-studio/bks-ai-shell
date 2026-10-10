import { defineStore } from "pinia";

export const useEncryptedSettingsStore = defineStore("encryptedSettings", {
  persist: { encrypted: true },
  state() {
    return {
      "providers.openai.apiKey": "",
      "providers.anthropic.apiKey": "",
      "providers.google.apiKey": "",
      "providers.zai.apiKey": "",
      "providers.deepseek.apiKey": "",
      providers_openaiCompat_apiKey: "",
    };
  },
  getters: {
    apiKeyExists(state): boolean {
      const apiKeys = [
        state["providers.openai.apiKey"],
        state["providers.anthropic.apiKey"],
        state["providers.google.apiKey"],
        state["providers.zai.apiKey"],
        state["providers.deepseek.apiKey"],
        state.providers_openaiCompat_apiKey,
      ];
      return apiKeys.some((apiKey) => apiKey.trim() !== "");
    },
  },
});
