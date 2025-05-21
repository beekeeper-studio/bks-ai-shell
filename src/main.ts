import "./assets/styles/main.scss";
import "@material-symbols/font-400/outlined.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { addNotificationListener, request } from "./vendor/@beekeeperstudio/plugin/comms";

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
