import "./assets/styles/main.scss";
import "@material-symbols/font-400/outlined.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import pluralize from "pluralize";
import App from "./App.vue";
import {
  addNotificationListener,
  setDebugComms,
  request,
} from "@beekeeperstudio/plugin";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import "@beekeeperstudio/plugin/dist/eventForwarder";

setDebugComms(true);

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
app.use(pinia);
app.config.globalProperties.$pluralize = pluralize;
app.config.globalProperties.$request = request;
app.mount("#app");
