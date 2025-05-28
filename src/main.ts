import "./assets/styles/main.scss";
import "@material-symbols/font-400/outlined.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { addNotificationListener, request } from "./vendor/@beekeeperstudio/plugin/comms";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";

hljs.registerLanguage("sql", sql);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);

async function injectStyle() {
  const theme = await request("getTheme");
  document.querySelector("#injected-style")!.textContent =
    `:root { ${theme.cssString} }`;
}

addNotificationListener("themeChanged", () => injectStyle());

injectStyle();

// Create and mount the Vue app
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.mount("#app");
