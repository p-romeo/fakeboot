import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 4317,
    strictPort: true,
  },
  preview: {
    port: 4317,
    strictPort: true,
  },
});
