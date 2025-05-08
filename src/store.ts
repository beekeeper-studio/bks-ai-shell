import { defineStore } from "pinia";
import { ProviderId, Providers, STORAGE_KEYS } from "./configs";

interface ProviderState {
  providerId: ProviderId;
  apiKey: string;
  model: string;
}

// the first argument is a unique id of the store across your application
export const useProviderStore = defineStore("providers", {
  state: (): ProviderState => ({
    providerId: getSelectedProvider() || "claude",
    apiKey: getApiKey(),
    model: getSelectedModel(),
  }),
  getters: {
    providerName: (state) =>
      Providers.find((p) => p.id === state.providerId)?.id || "",
  },
  actions: {
    setProvider(providerId: ProviderId) {
      this.providerId = providerId;
      saveSelectedProvider(providerId);
    },
    setApiKey(apiKey: string) {
      this.apiKey = apiKey;
      saveApiKey(apiKey);
    },
    setModel(model: string) {
      this.model = model;
      saveSelectedModel(model);
    },
  },
});

export function saveApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
}

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
}

export function saveSelectedModel(model: string): void {
  localStorage.setItem(STORAGE_KEYS.MODEL, model);
}

export function getSelectedModel(): ProviderId | "" {
  return (localStorage.getItem(STORAGE_KEYS.MODEL) as ProviderId) || "";
}

export function saveSelectedProvider(provider: string): void {
  localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
}

export function getSelectedProvider(): ProviderId | null {
  return (localStorage.getItem(STORAGE_KEYS.PROVIDER) as ProviderId) || "";
}

/**
 * Clear all stored data (for logout)
 */
export async function clearStoredData(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
  localStorage.removeItem(STORAGE_KEYS.PROVIDER);
  localStorage.removeItem(STORAGE_KEYS.MODEL);
}
