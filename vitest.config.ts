import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  // Next.js uses the string-plugin PostCSS format that Vite can't load; the
  // unit tests never touch CSS, so bypass PostCSS config discovery entirely.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
