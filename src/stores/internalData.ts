/** Global data that is used internally. Unlike the settings stores,
 * nothing in here should be configurable by the user. */

import { defineStore } from "pinia";

export const useInternalDataStore = defineStore("pluginData", {
  persist: true,
  state() {
    return {
      /** FIXME use Model type */
      lastUsedModelId: undefined as string | undefined,
      isFirstTimeUser: true,
    };
  },
});
