import { defineConfig } from "drizzle-kit";

// Schema-only configuration: intentionally no credentials or database client.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
