import type { ComponentCustomProperties } from 'vue'
import type { AppEvent, AppEventHandlers } from './plugins/appEvent'
import type { openExternal } from '@beekeeperstudio/plugin';
import type pluralize from "pluralize";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    trigger: <T extends AppEvent>(
      event: T,
      ...args: Parameters<AppEventHandlers[T]>
    ) => void;
    $pluralize: typeof pluralize;
    $openExternal: typeof openExternal;
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*?raw' {
  const content: string
  export default content
}
