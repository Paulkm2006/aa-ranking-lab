import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/aa-ranking-lab/",
  test: { include: ["src/**/*.test.ts"] },
});
