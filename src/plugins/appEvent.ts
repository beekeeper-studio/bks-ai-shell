import type { tools } from "@/tools";
import { expandTableResult, QueryResult } from "@beekeeperstudio/plugin";
import { Plugin, App } from "vue";
import { z } from "zod";

export type AppEvent = keyof AppEventHandlers;

export interface AppEventHandlers {
  showResultTable: (queryResults: QueryResult[]) => void;
  showedResultTable: (queryResults: QueryResult[]) => void;
  resolvePermission: (response: PermissionResponse) => void;
  editToolArgs: <T extends keyof typeof tools>(tool: EditableTool<T>) => void;
}

export type PermissionResponse = {
  /** If `toolCallId` is not provided, the response applies to all
   * tool calls that are currently pending. */
  toolCallId?: string;
  status: "accepted" | "rejected";
};

export type EditableTool<T extends keyof typeof tools> = {
  toolName: T;
  args: z.infer<(typeof tools)[T]["parameters"]>;
};

export type RootBinding = {
  [K in keyof AppEventHandlers]: {
    event: K;
    handler: AppEventHandlers[K];
  };
}[keyof AppEventHandlers];

export function createAppEvent(): Plugin {
  const events: {
    [key in AppEvent]?: RootBinding["handler"][];
  } = {
    showResultTable: [
      async (queryResults: QueryResult[]) => {
        await expandTableResult(queryResults);
        trigger("showedResultTable", queryResults);
      },
    ],
  };

  const trigger: App["config"]["globalProperties"]["trigger"] = (
    event,
    ...args
  ) => {
    if (events[event]) {
      events[event].forEach((handler) => handler(...args));
    }
  };

  function on(event: string, handler: RootBinding["handler"]) {
    if (!events[event]) {
      events[event] = [];
    }
    events[event].push(handler);
  }

  function off(event: string, handler: RootBinding["handler"]) {
    if (events[event]) {
      const idx = events[event].indexOf(handler);
      if (idx > -1) {
        events[event].splice(idx, 1);
      }
    }
  }

  return {
    install(app) {
      app.config.globalProperties.trigger = trigger;

      app.mixin({
        mounted() {
          if (!this.rootBindings) {
            return;
          }

          if (!Array.isArray(this.rootBindings)) {
            console.error("rootBindings must be an array");
          }

          this.rootBindings.forEach(({ event, handler }) => {
            on(event, handler);
          });
        },
        beforeDestroy() {
          if (!this.rootBindings) {
            return;
          }

          if (!Array.isArray(this.rootBindings)) {
            console.error("rootBindings must be an array");
          }

          this.rootBindings.forEach(({ event, handler }) => {
            off(event, handler);
          });
        },
      });
    },
  };
}
