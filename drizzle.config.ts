import { defineConfig } from "drizzle-kit";

// Generation is offline; execution uses the guarded tooling/database runner.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
