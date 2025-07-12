/** Global data that is used internally and unlike configration.ts,
 * anything in here should not be configurable by user.
 *
 * Usage:
 *
 * 1. Call `sync()` if it hasn't been called yet.
 * 2. Read the state by accessing it normally.
 * 3. Use `setInternal()` to update the state.
 *
 */

import { ProviderId } from "@/providers";
import { defineStore } from "pinia";
import _ from "lodash";
import {
  getData as rawGetData,
  setData as rawSetData,
} from "@beekeeperstudio/plugin";

type InternalData = {
  lastUsedProviderId: ProviderId;
  lastUsedModelId?: string;
};

const defaultData: InternalData = {
  lastUsedProviderId: "anthropic",
  lastUsedModelId: undefined,
};

const getData: typeof rawGetData = (key, ...args) => {
  return rawGetData(`internal.${key}`, ...args);
};

const setData: typeof rawSetData = (key, ...args) => {
  return rawSetData(`internal.${key}`, ...args);
};

export const useInternalDataStore = defineStore("pluginData", {
  state: (): InternalData => {
    return defaultData;
  },

  actions: {
    async sync() {
      const data: Partial<InternalData> = {};
      for (const key in defaultData) {
        const value = await getData(key);

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
      // If we change the provider, reset the model
      if (key === "lastUsedProviderId" && value !== this.lastUsedProviderId) {
        this.lastUsedModelId = undefined;
      }
      this.$patch({ [key]: value });
      await setData(key, value);
    },
  },
});
