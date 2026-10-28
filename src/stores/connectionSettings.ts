import { defineStore } from "pinia";

export const useConnectionSettingsStore = defineStore("connectionSettings", {
  persist: { scope: "currentConnection" },
  state() {
    return {
      /** Appended to the system instructions, for this connection only. */
      connectionInstructions: "",
    };
  },
});
