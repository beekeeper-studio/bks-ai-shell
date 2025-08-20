import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import bks from "@beekeeperstudio/vite-plugin";

export default defineConfig({
  plugins: [vue(), bks()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
