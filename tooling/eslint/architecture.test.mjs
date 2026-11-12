import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = fileURLToPath(new URL("../../", import.meta.url));
const eslint = new ESLint({ cwd: root });
const modulePath = "src/modules/_template/";

const cases = [
  [
    "Zod allowed only in presentation validation boundary",
    "presentation/validation.server.ts",
    'import "server-only"; import "zod";',
    false,
  ],
  ["domain cannot import Zod", "domain/model.ts", 'import "zod";', true],
  [
    "application cannot import Zod",
    "application/use-case.ts",
    'import "zod";',
    true,
  ],
  [
    "other presentation files cannot import packages",
    "presentation/contracts.ts",
    'import "zod";',
    true,
  ],
  [
    "domain can import core",
    "domain/model.ts",
    'import type { Result } from "@/core/results"; export type Value = Result<string, string>;',
    false,
  ],
  [
    "domain cannot import Next.js",
    "domain/model.ts",
    'import type { Metadata } from "next"; export type Value = Metadata;',
    true,
  ],
  [
    "domain cannot import Drizzle",
    "domain/model.ts",
    'import "drizzle-orm";',
    true,
  ],
  [
    "domain cannot re-export infrastructure",
    "domain/model.ts",
    'export * from "../infrastructure";',
    true,
  ],
  [
    "domain cannot import external SDKs",
    "domain/model.ts",
    'import "external-sdk";',
    true,
  ],
  [
    "application cannot dynamically load adapters",
    "application/use-case.ts",
    'export const adapter = import("../infrastructure");',
    true,
  ],
  [
    "application cannot require adapters",
    "application/use-case.ts",
    'export const adapter = require("../infrastructure");',
    true,
  ],
  [
    "application cannot type-import adapters",
    "application/use-case.ts",
    'export type Adapter = typeof import("../infrastructure");',
    true,
  ],
  [
    "application cannot load computed paths",
    "application/use-case.ts",
    "export const load = (name: string) => import(name);",
    true,
  ],
  [
    "presentation cannot import domain directly",
    "presentation/contracts.ts",
    'export type { Value } from "../domain/model";',
    true,
  ],
  [
    "application can import domain",
    "application/use-case.ts",
    'export type { Value } from "../domain/model";',
    false,
  ],
  [
    "cross-module public types allowed",
    "application/use-case.ts",
    'export type { Contract } from "@/modules/another/application/public";',
    false,
  ],
  [
    "cross-module runtime imports forbidden",
    "application/use-case.ts",
    'import "@/modules/another/application/public";',
    true,
  ],
  [
    "cross-module internals forbidden",
    "application/use-case.ts",
    'export type { Contract } from "@/modules/another/domain/contracts";',
    true,
  ],
  [
    "infrastructure may use external adapters",
    "infrastructure/adapter.ts",
    'import "server-only"; import "external-sdk";',
    false,
  ],
];

for (const [name, file, source, forbidden] of cases) {
  test(name, async () => {
    const [result] = await eslint.lintText(source, {
      filePath: modulePath + file,
    });
    assert.equal(
      result.messages.some((m) => m.ruleId === "boundaries/dependencies"),
      forbidden,
      JSON.stringify(result.messages),
    );
    assert.equal(
      result.messages.some((m) => m.fatal),
      false,
    );
  });
}

test("core cannot depend on features", async () => {
  const [result] = await eslint.lintText(
    'export type { Value } from "@/modules/_template/application/public";',
    { filePath: "src/core/probe.ts" },
  );
  assert.ok(
    result.messages.some((m) => m.ruleId === "boundaries/dependencies"),
  );
});

test("module infrastructure requires server-only", async () => {
  const [result] = await eslint.lintText("export {};", {
    filePath: modulePath + "infrastructure/probe.ts",
  });
  assert.ok(
    result.messages.some((m) => m.ruleId === "architecture/server-only"),
  );
});

test("domain cannot call the external fetch global", async () => {
  const [result] = await eslint.lintText(
    'export const load = () => fetch("https://example.com");',
    { filePath: modulePath + "domain/probe.ts" },
  );
  assert.ok(result.messages.some((m) => m.ruleId === "no-restricted-globals"));
});

test("detects local type import cycles", async () => {
  const parent = path.join(root, "src/modules");
  const temporary = fs.mkdtempSync(path.join(parent, "architecture-check-"));
  try {
    const domain = path.join(temporary, "domain");
    fs.mkdirSync(domain);
    const source =
      'export type { B } from "./b"; export interface A { readonly a: string }';
    fs.writeFileSync(path.join(domain, "a.ts"), source);
    fs.writeFileSync(
      path.join(domain, "b.ts"),
      'export type { A } from "./a"; export interface B { readonly b: string }',
    );
    const [result] = await eslint.lintText(source, {
      filePath: path.join(domain, "a.ts"),
    });
    assert.ok(
      result.messages.some(
        (m) =>
          m.ruleId === "boundaries/dependencies" && m.messageId === "cycle",
      ),
    );
  } finally {
    assert.equal(path.dirname(temporary), parent);
    assert.ok(path.basename(temporary).startsWith("architecture-check-"));
    fs.rmSync(temporary, { recursive: true });
  }
});
