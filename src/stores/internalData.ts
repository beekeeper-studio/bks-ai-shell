/** Global data that is used internally and unlike configration.ts,
 * anything in here should not be configurable by user.
 *
 * Usage:
 *
 * 1. Call `sync()` if it hasn't been called yet.
 * 2. Read the state by accessing it normally.
 * 3. Please don't mutate the state directly. Use `setInternal()` or any setter
 *    so they are saved.
 */

import { defineStore } from "pinia";
import _ from "lodash";
import { appStorage } from "@beekeeperstudio/plugin";

type InternalData = {
  /** FIXME use Model type */
  lastUsedModelId?: string;
  isFirstTimeUser: boolean;
};

const defaultData: InternalData = {
  lastUsedModelId: undefined,
  isFirstTimeUser: true,
};

export const useInternalDataStore = defineStore("pluginData", {
  state: (): InternalData => {
    return defaultData;
  },

  actions: {
    async sync() {
      const data: Partial<InternalData> = {};
      for (const key in defaultData) {
        const value = await appStorage.getItem(`internal.${key}`);

        if (value === null) {
          continue;
        }

        data[key] = value;
      }

      this.$patch(data);
    },
    async setInternal<T extends keyof InternalData>(
      key: T,
      value: InternalData[T],
    ) {
      this.$patch({ [key]: value });
      await appStorage.setItem(`internal.${key}`, value);
    },
  },
});
