/** Global data that is used internally and unlike configration.ts,
 * anything in here should not be configurable by user. */

import { defineStore } from "pinia";

export const useInternalDataStore = defineStore("pluginData", {
  persist: true,
  state() {
    return {
      /** FIXME use Model type */
      lastUsedModelId: undefined,
      isFirstTimeUser: true,
    };
  },
});
