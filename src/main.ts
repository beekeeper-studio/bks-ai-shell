import { getAppInfo, log } from "@beekeeperstudio/plugin";
// FIXME move this to Beekeeper Studio as injected script
window.addEventListener("error", (e) => {
  log.error(e);
});
window.addEventListener("unhandledrejection", (e) => {
  log.error(e);
});
// -------------------

import "typeface-roboto";
import "./assets/styles/main.scss";
import "@material-symbols/font-400/outlined.css";

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

// Apply theme from Beekeeper Studio
getAppInfo()
  .then((info) => {
    document.querySelector("#injected-style")!.textContent =
      `:root { ${info.theme.cssString} }`;
  })
  .catch((e) => {
    if (e.message === "Unknown request: getAppInfo") {
      // This means we are running in an older version of Beekeeper
      // Studio (< 5.4.0-beta.2).
      return;
    }

    throw new Error("cannot get app info", { cause: e });
  });

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
