import { ComponentCustomProperties } from 'vue'
import { AppEvent, AppEventHandlers } from './plugins/appEvent'

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    trigger: <T extends AppEvent>(
      event: T,
      ...args: Parameters<AppEventHandlers[T]>
    ) => void;
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
