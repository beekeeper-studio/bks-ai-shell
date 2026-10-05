import { defineStore } from "pinia";

export const useConnectionSettingsStore = defineStore("connectionSettings", {
  persist: { scope: "currentConnection" },
  state() {
    return {
      enableRunQuery: true,
    };
  },
});
