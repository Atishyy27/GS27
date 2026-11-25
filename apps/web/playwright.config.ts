import { defineConfig } from "@playwright/test";

// Runs in GitHub Actions only (needs a production build first). The app runs with GS27_MOCK=1: no Supabase.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "pnpm start -p 3100",
    url: "http://127.0.0.1:3100/mock/subject/ME46018",
    env: { GS27_MOCK: "1" },
    timeout: 60_000,
  },
});
