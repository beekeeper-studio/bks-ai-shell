import { defineStore } from "pinia";
import type { DefineStoreOptions, StateTree, _GettersTree } from "pinia";
import { watch } from "vue";
import _ from "lodash";
import { AppStorage } from "@beekeeperstudio/plugin";
import type { AppStorageOptions } from "@beekeeperstudio/plugin";

type StoreState = Record<string, unknown>;

type DefineAppStorageStoreOptions<
  Id extends string,
  Schema extends StateTree,
  Getters,
  Actions,
> = Omit<DefineStoreOptions<Id, Schema, Getters, Actions>, "id" | "state"> & {
  state: () => Schema;
} & AppStorageOptions;

/**
 * Like `defineStore`, but every key returned by `state()` is saved to
 * `AppStorage`. Call `sync()` before reading the state.
 */
export function defineAppStorageStore<
  Id extends string,
  Schema extends StateTree,
  Getters extends _GettersTree<Schema> = {},
  Actions = {},
>(id: Id, options: DefineAppStorageStoreOptions<Id, Schema, Getters, Actions>) {
  const keys = Object.keys(options.state());
  const storage = new AppStorage({
    encrypted: options.encrypted,
    scope: options.scope,
  });

  return defineStore(id, {
    state: options.state,
    getters: options.getters as Getters,
    actions: {
      ...(options.actions as Actions),
      async sync() {
        const loadedState: Record<string, unknown> = {};

        for (const key of keys) {
          const value = await storage.getItem(key);
          if (value === null) {
            continue;
          }
          loadedState[key] = value;
        }

        this.$patch(loadedState as Schema);

        const store = this as StoreState;

        for (const key of keys) {
          // Clone so the host receives plain objects instead of reactive Proxies.
          watch(
            () => store[key],
            (value) => storage.setItem(key, _.cloneDeep(value)),
            { deep: true },
          );
        }
      },
    },
  });
}
