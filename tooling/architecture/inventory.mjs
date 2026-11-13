import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const root = fileURLToPath(new URL("../../", import.meta.url));
const excluded = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "out",
  "build",
]);
const compare = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
function entries(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        !excluded.has(entry.name) &&
        entry.name !== "tsconfig.tsbuildinfo" &&
        entry.name !== "next-env.d.ts" &&
        (!entry.name.startsWith(".env") || entry.name === ".env.example"),
    )
    .sort(compare);
}
export function files(directory = root) {
  return entries(directory).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
export function sourceInventory() {
  return files(path.join(root, "src"))
    .filter((file) => /\.[cm]?[jt]sx?$/.test(file))
    .map((file) => ({
      file,
      relative: path.relative(root, file).replaceAll(path.sep, "/"),
      ast: ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      ),
    }));
}
export function moduleEdges() {
  const edges = new Map();
  for (const { file, relative, ast } of sourceInventory()) {
    const from = /^src\/modules\/([^/]+)\//.exec(relative)?.[1];
    if (!from) continue;
    function record(specifier, typeOnly) {
      const destination = specifier.startsWith("@/")
        ? specifier.slice(2)
        : path
            .relative(
              path.join(root, "src"),
              path.resolve(path.dirname(file), specifier),
            )
            .replaceAll(path.sep, "/");
      const to = /^modules\/([^/]+)\//.exec(destination)?.[1];
      if (!to || from === to) return;
      const key = `${from}|${to}`;
      const edge = edges.get(key) ?? {
        from,
        to,
        typeOnly: true,
        files: new Set(),
      };
      edge.typeOnly &&= typeOnly;
      edge.files.add(relative);
      edges.set(key, edge);
    }
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const clause = ts.isImportDeclaration(node)
          ? node.importClause
          : undefined;
        const named = clause?.namedBindings;
        const typeOnly = !!(
          node.isTypeOnly ||
          clause?.isTypeOnly ||
          (!clause?.name &&
            named &&
            ts.isNamedImports(named) &&
            named.elements.length > 0 &&
            named.elements.every((entry) => entry.isTypeOnly))
        );
        record(node.moduleSpecifier.text, typeOnly);
      }
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        record(node.argument.literal.text, true);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        record(node.arguments[0].text, false);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  return [...edges.values()].sort((a, b) =>
    `${a.from}|${a.to}`.localeCompare(`${b.from}|${b.to}`),
  );
}
export function projectTree() {
  const lines = ["velvet-book/"];
  function walk(directory, prefix) {
    const children = entries(directory);
    children.forEach((entry, index) => {
      const last = index === children.length - 1;
      lines.push(
        `${prefix}${last ? "└── " : "├── "}${entry.name}${entry.isDirectory() ? "/" : ""}`,
      );
      if (entry.isDirectory())
        walk(
          path.join(directory, entry.name),
          `${prefix}${last ? "    " : "│   "}`,
        );
    });
  }
  walk(root, "");
  return lines.join("\n");
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] !== "--write")
    throw new Error("Use --write to refresh documentation inventories");
  const directory = path.join(root, "docs/architecture");
  const treeFile = path.join(directory, "project-tree.md");
  if (!fs.existsSync(treeFile)) fs.writeFileSync(treeFile, "");
  const dependenciesFile = path.join(directory, "module-dependencies.md");
  if (!fs.existsSync(dependenciesFile)) fs.writeFileSync(dependenciesFile, "");
  const edges = moduleEdges();
  fs.writeFileSync(
    dependenciesFile,
    `# Module dependencies\n\nGenerated from actual source imports by \`node tooling/architecture/inventory.mjs --write\`.\nArrows mean source depends on destination, including erased type imports.\nNo injected runtime dependency is implied. ESLint separately resolves local source\npaths and checks cycles, re-exports and layer restrictions.\n\n## Current cross-module graph\n\n\`\`\`mermaid\nflowchart LR\n${edges.map((edge) => `  ${edge.from.replaceAll("-", "_")}["${edge.from}"] --> ${edge.to.replaceAll("-", "_")}["${edge.to}"]`).join("\n")}\n\`\`\`\n\n| Consumer | Public type dependency | Import kind | Source files |\n| --- | --- | --- | --- |\n${edges.map((edge) => `| ${edge.from} | ${edge.to} | ${edge.typeOnly ? "type only" : "runtime (review required)"} | ${edge.files.size} |`).join("\n")}\n\nModules absent from this graph have no cross-module imports; they can still depend\non core. The reusable _template is not a business module. See the complete module\ninventory in [the roadmap](future-api-roadmap.md).\n\n## Allowed directions and ownership\n\nPresentation imports its application; application imports its domain; infrastructure\nimplements its application ports. Domain imports only its own domain and core.\nOther modules may import only types from application/public.ts; runtime coordination\nuses consumer-owned ports injected by a future server composition root. No root\nor dependency injection container exists today. Database FK dependencies are\nseparate from feature imports and use concrete schema files to avoid barrel cycles.\n\nCore imports core only. Configuration imports core/configuration and Zod; shared\nhelpers import core/shared, with Zod limited to server validation files. Module\ninfrastructure may import shared infrastructure, db and config, plus external\npackages. Module presentation cannot currently import shared response helpers; a\nfuture transport/composition root can apply them outside the feature layer.\n\nThe import checker is a repository-specific guardrail, not a security sandbox.\nNew aliases, extension conventions, computed loads or indirect global access need\nreview. src/app, src/db and shared infrastructure do not have the same inward\nmodule restrictions; cycle checks still apply to resolved local imports. Keep\nfuture composition server-only and prohibit feature back-references there.\n`,
  );
  fs.writeFileSync(
    treeFile,
    `# Audited project tree\n\nComplete authored-file tree, including empty scaffold directories and .gitkeep files.\nExcluded: .git, node_modules, .next, coverage, out, build, generated next-env.d.ts\nand tsconfig.tsbuildinfo, and private .env files. Public assets are included.\nRegenerate after file changes with \`node tooling/architecture/inventory.mjs --write\`.\n\n\`\`\`text\n${projectTree()}\n\`\`\`\n`,
  );
  console.log(
    JSON.stringify({
      sourceFiles: sourceInventory().length,
      modules: entries(path.join(root, "src/modules")).filter(
        (entry) => entry.isDirectory() && entry.name !== "_template",
      ).length,
      crossModuleEdges: edges.length,
      runtimeCrossModuleEdges: edges.filter((edge) => !edge.typeOnly).length,
    }),
  );
}
