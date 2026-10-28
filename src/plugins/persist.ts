import type { PiniaPluginContext } from "pinia";
import { watch } from "vue";
import { appStorage, log } from "@beekeeperstudio/plugin";
import type { AppStorageOptions } from "@beekeeperstudio/plugin";
import _ from "lodash";

declare module "pinia" {
  export interface DefineStoreOptionsBase<S, Store> {
    /** Load the state from `appStorage` and save every change back to it. */
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

  const storageOptions = persist === true ? {} : persist;

  return {
    async sync() {
      const savedState = await appStorage.get(
        context.store.$id,
        storageOptions,
      );
      if (savedState !== null) {
        context.store.$patch(savedState as any);
      }

      watch(
        () => context.store.$state,
        (state) => {
          appStorage
            .set(
              context.store.$id,
              // Clone so the host receives a plain object, not a reactive Proxy.
              _.cloneDeep(state),
              storageOptions,
            )
            .catch(log.error);
        },
        { deep: true },
      );
    },
  };
}
