import type { PiniaPluginContext } from "pinia";
import { watch } from "vue";
import { AppStorage, log } from "@beekeeperstudio/plugin";
import type { AppStorageOptions } from "@beekeeperstudio/plugin";
import _ from "lodash";

declare module "pinia" {
  export interface DefineStoreOptionsBase<S, Store> {
    /** Load the state from `AppStorage` and save every change back to it. */
    persist?: true | AppStorageOptions;
  }

  export interface PiniaCustomProperties {
    /** Load the saved state. Only stores defined with `persist` have this. */
    sync(): Promise<void>;
  }
}

/** Pinia plugin for stores defined with `persist`. */
export function persistPlugin(context: PiniaPluginContext) {
  const persist = context.options.persist;
  if (!persist) {
    return;
  }

  const storage = new AppStorage(persist === true ? {} : persist);

  return {
    async sync() {
      const savedState = await storage.get(context.store.$id);
      if (savedState !== null) {
        context.store.$patch(savedState);
      }

      watch(
        () => context.store.$state,
        (state) => {
          // Clone so the host receives a plain object, not a reactive Proxy.
          storage.set(context.store.$id, _.cloneDeep(state)).catch(log.error);
        },
        { deep: true },
      );
    },
  };
}
