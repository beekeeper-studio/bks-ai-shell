declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*?raw' {
  const content: string
  export default content
}

// declare module '@vue/runtime-core' {
//   import { request } from '@beekeeperstudio/plugin'
//   import pluralize from 'pluralize'
//
//   interface ComponentCustomProperties {
//     $request: typeof request
//     $pluralize: typeof pluralize
//   }
// }
