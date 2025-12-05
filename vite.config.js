import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import bks from "@beekeeperstudio/vite-plugin";
import vueDevTools from 'vite-plugin-vue-devtools'

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
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
