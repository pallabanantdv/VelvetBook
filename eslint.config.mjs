import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { dependencyDirection } from "./tooling/eslint/architecture.mjs";

// Next.js rejects transitive client imports of modules marked server-only.
const serverBoundary = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      missing: 'Backend modules must import "server-only".',
      client: 'Backend modules cannot declare "use client".',
    },
  },
  create(context) {
    return {
      Program(node) {
        if (
          !node.body.some(
            (entry) =>
              entry.type === "ImportDeclaration" &&
              entry.source.value === "server-only",
          )
        ) {
          context.report({ node, messageId: "missing" });
        }
        for (const entry of node.body) {
          if (
            entry.type === "ExpressionStatement" &&
            entry.directive === "use client"
          ) {
            context.report({ node: entry, messageId: "client" });
          }
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/**/*.{ts,tsx,js,jsx,mts,mjs}"],
    plugins: {
      boundaries: { rules: { dependencies: dependencyDirection } },
    },
    rules: { "boundaries/dependencies": "error" },
  },
  {
    files: [
      "src/core/**/*.{ts,tsx,js,jsx,mts,mjs}",
      "src/modules/*/{domain,application}/**/*.{ts,tsx,js,jsx,mts,mjs}",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message: "Use an application port for environment access.",
        },
        {
          name: "fetch",
          message: "Use an application port for external services.",
        },
        {
          name: "window",
          message: "Keep core and inner layers independent of the browser.",
        },
        {
          name: "document",
          message: "Keep core and inner layers independent of the browser.",
        },
      ],
    },
  },
  {
    files: [
      "src/{db,infrastructure}/**/*.{ts,tsx,js,jsx,mts,mjs}",
      "src/modules/*/infrastructure/**/*.{ts,tsx,js,jsx,mts,mjs}",
      "src/**/server/**/*.{ts,tsx,js,jsx,mts,mjs}",
      "src/**/*.server.{ts,tsx,js,jsx,mts,mjs}",
    ],
    ignores: ["**/*.d.ts"],
    plugins: { architecture: { rules: { "server-only": serverBoundary } } },
    rules: { "architecture/server-only": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
