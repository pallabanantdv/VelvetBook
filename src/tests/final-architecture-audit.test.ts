import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

const root = process.cwd();
function files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const sourceFiles = files(path.join(root, "src")).filter(
  (file) =>
    /\.[cm]?[jt]sx?$/.test(file) &&
    !file.includes(`${path.sep}tests${path.sep}`),
);
test("only authentication routes and identity/security implementations are enabled", () => {
  for (const file of sourceFiles) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    if (
      /(^|\/)route\.[cm]?[jt]sx?$/.test(relative) ||
      /^src\/(pages\/api|app\/api)\//.test(relative)
    )
      assert.match(
        relative,
        /^src\/app\/api\/v1\/(auth\/(register|login|logout|me|password-reset\/(request|complete)|mfa\/(enroll|verify))|customer\/profile)\/route\.ts$/,
      );
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression))
        assert.notEqual(node.expression.text, "use server", relative);
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const databaseAdapter =
          relative === "src/db/client.server.ts" ||
          relative === "src/db/migrations.server.ts";
        const restrictedImport =
          /^(pg($|\/)|postgres($|\/)|drizzle-orm\/(node-postgres|postgres-js)|node:(https?|net|tls)$)/.test(
            node.moduleSpecifier.text,
          );
        assert.ok(!restrictedImport || databaseAdapter, relative);
      }
      if (
        ts.isCallExpression(node) &&
        !relative.startsWith("src/db/") &&
        !relative.startsWith("src/infrastructure/authentication/") &&
        !/^src\/modules\/(identity|authorization)\/infrastructure\//.test(
          relative,
        )
      ) {
        assert.equal(
          node.expression.getText(ast) === "fetch" ||
            /\.(connect|query|execute)$/.test(node.expression.getText(ast)),
          false,
          relative,
        );
      }
      if (
        relative.startsWith("src/modules/") &&
        !/^src\/modules\/(identity|authorization|customers)\//.test(relative) &&
        !relative.endsWith("/presentation/validation.server.ts")
      ) {
        assert.equal(
          ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isClassDeclaration(node) ||
            ts.isNewExpression(node) ||
            ts.isCallExpression(node),
          false,
          `Unexpected implementation in ${relative}`,
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
});
test("every business module has the shared four-layer scaffold and a roadmap entry", () => {
  const directory = path.join(root, "src/modules");
  const roadmap = fs.readFileSync(
    path.join(root, "docs/architecture/future-api-roadmap.md"),
    "utf8",
  );
  const modules = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "_template");
  assert.equal(modules.length, 35);
  for (const entry of modules) {
    for (const layer of [
      "domain",
      "application",
      "infrastructure",
      "presentation",
    ])
      assert.ok(
        fs.statSync(path.join(directory, entry.name, layer)).isDirectory(),
        `${entry.name}/${layer}`,
      );
    assert.match(
      roadmap,
      new RegExp(`^\\|\\s+${entry.name}\\s+\\|`, "m"),
      entry.name,
    );
  }
});
test("data dictionary names every declared table and column", () => {
  const dictionary = fs.readFileSync(
    path.join(root, "docs/database/data-dictionary.md"),
    "utf8",
  );
  for (const table of Object.values(schema).map(getTableConfig)) {
    assert.match(dictionary, new RegExp(`\\b${table.name}\\b`), table.name);
    for (const column of table.columns)
      assert.match(
        dictionary,
        new RegExp(`\\b${column.name}\\b`),
        `${table.name}.${column.name}`,
      );
  }
});
