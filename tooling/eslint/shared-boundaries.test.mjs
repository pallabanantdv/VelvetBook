import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const eslint = new ESLint({
  cwd: fileURLToPath(new URL("../../", import.meta.url)),
});
const cases = [
  [
    "configuration cannot import a feature",
    "src/config/example.server.ts",
    'import "server-only"; import "@/modules/bookings/application/public";',
    true,
  ],
  [
    "configuration cannot import a database driver",
    "src/config/example.server.ts",
    'import "server-only"; import "pg";',
    true,
  ],
  [
    "shared cannot import a feature",
    "src/shared/example.ts",
    'import "@/modules/bookings/application/public";',
    true,
  ],
  [
    "core cannot import configuration",
    "src/core/example.ts",
    'import "@/config/environment.server";',
    true,
  ],
  [
    "shared validation can import Zod behind a server boundary",
    "src/shared/validation/example.server.ts",
    'import "server-only"; import "zod";',
    false,
  ],
  [
    "shared presentation cannot import Zod",
    "src/shared/presentation/example.ts",
    'import "zod";',
    true,
  ],
  [
    "shared cannot hide imports behind computed paths",
    "src/shared/example.ts",
    'const name = "pg"; export const adapter = import(name);',
    true,
  ],
];
for (const [name, filePath, code, forbidden] of cases) {
  test(name, async () => {
    const [result] = await eslint.lintText(code, { filePath });
    assert.equal(
      result.messages.some(
        (message) => message.ruleId === "boundaries/dependencies",
      ),
      forbidden,
      JSON.stringify(result.messages),
    );
  });
}
