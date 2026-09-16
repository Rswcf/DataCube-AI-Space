import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Golden HTML/JSON pins Intl.DateTimeFormat output. Three render call sites
    // (week page, article page, ai-news-aggregator tool page) format a Date with
    // an unscoped Intl.DateTimeFormat/toLocaleDateString — no `timeZone` option —
    // so the rendered string depends on the *runtime's* zone, not just the Date's
    // UTC instant. Pinning the whole test run to UTC (matching how the goldens
    // were captured) makes every golden byte-stable regardless of the machine or
    // CI runner's local zone. See task-1-review.md §2.
    env: { TZ: "UTC" },
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "test/**/*.test.ts"],
  },
});
