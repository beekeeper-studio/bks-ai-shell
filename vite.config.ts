import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import bks from "@beekeeperstudio/vite-plugin";
import path from "path";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "bks-sql-text-editor",
        },
      },
    }),
    Boolean(process.env.DISABLE_DEVTOOLS)
      ? undefined
      : vueDevTools({ appendTo: "main.ts" }),
    bks(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
