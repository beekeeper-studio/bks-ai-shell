import { notify } from "@beekeeperstudio/plugin";
// FIXME move this to Beekeeper Studio as injected script
window.addEventListener("error", (e) => {
  notify("pluginError", {
    message: e.message,
    name: e.name,
    stack: e.stack,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  notify("pluginError", {
    message: e.reason?.message,
    name: e.reason?.name,
    stack: e.reason?.stack,
  });
});
// -------------------

import "typeface-roboto";
import "typeface-source-code-pro";
import "@beekeeperstudio/ui-kit/sql-text-editor";

import { createApp } from "vue";
import { createPinia } from "pinia";
import pluralize from "pluralize";
import App from "@/App.vue";
import {
  addNotificationListener,
  setDebugComms,
  openExternal,
} from "@beekeeperstudio/plugin";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import "@beekeeperstudio/plugin/dist/eventForwarder";
import { createAppEvent } from "@/plugins/appEvent";

setDebugComms(false);

hljs.registerLanguage("sql", sql);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);

addNotificationListener("themeChanged", (args) => {
  document.querySelector("#injected-style")!.textContent =
    `:root { ${args.cssString} }`;
});

// Create and mount the Vue app
const app = createApp(App);
const pinia = createPinia();
const appEvent = createAppEvent();
app.use(pinia);
app.use(appEvent);
app.config.globalProperties.$pluralize = pluralize;
app.config.globalProperties.$openExternal = openExternal;
app.mount("#app");
