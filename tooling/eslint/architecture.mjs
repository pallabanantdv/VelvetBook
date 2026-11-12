import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"];

function resolveImport(from, specifier, root) {
  const base = specifier.startsWith("@/")
    ? path.resolve(root, "src", specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(from), specifier)
      : undefined;
  if (!base) return undefined;
  return (
    [
      ...(/\.[cm]?jsx?$/.test(base)
        ? [
            base.replace(/\.[cm]?jsx?$/, ".ts"),
            base.replace(/\.[cm]?jsx?$/, ".tsx"),
            base.replace(/\.mjs$/, ".mts"),
          ]
        : []),
      ...extensions.map((ext) => base + ext),
      ...extensions.slice(1).map((ext) => path.join(base, "index" + ext)),
    ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? base
  );
}

function location(file, root) {
  return path.relative(root, file).split(path.sep).join("/");
}

function moduleLocation(relative) {
  const match =
    /^src\/modules\/([^/]+)\/(domain|application|infrastructure|presentation)\//.exec(
      relative,
    );
  return match ? { name: match[1], layer: match[2] } : undefined;
}

// Read import edges with TypeScript, including type imports and dynamic imports.
function imports(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return [];
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const edges = [];
  function visit(node) {
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      edges.push(node.moduleReference.expression.text);
    }
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      edges.push(node.moduleSpecifier.text);
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      edges.push(node.argument.literal.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      edges.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return edges;
}

export const dependencyDirection = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden: "Import violates the architecture: {{source}} -> {{target}}.",
      cycle: "Circular dependency through {{target}}.",
      dynamic:
        "Use a literal import path so architecture boundaries can be checked.",
    },
  },
  create(context) {
    const root = context.cwd;
    const file = path.resolve(context.filename);
    const source = location(file, root);
    const owner = moduleLocation(source);
    const isCore = source.startsWith("src/core/");
    const allowed = {
      domain: ["domain"],
      application: ["application", "domain"],
      infrastructure: ["infrastructure", "application", "domain"],
      presentation: ["presentation", "application"],
    };
    function check(node, specifier, typeOnly = false) {
      const targetFile = resolveImport(file, specifier, root);
      const target = targetFile ? location(targetFile, root) : specifier;
      const destination = moduleLocation(target);
      let valid = true;
      if (isCore) valid = target.startsWith("src/core/");
      if (owner) {
        if (target.startsWith("src/core/")) valid = true;
        else if (destination?.name === owner.name)
          valid = allowed[owner.layer].includes(destination.layer);
        else if (destination) {
          valid =
            owner.layer !== "domain" &&
            typeOnly &&
            [
              `src/modules/${destination.name}/application/public.ts`,
              `src/modules/${destination.name}/application/public`,
            ].includes(target);
        } else if (owner.layer === "infrastructure") {
          valid =
            !targetFile ||
            ["src/infrastructure/", "src/db/", "src/config/"].some((prefix) =>
              target.startsWith(prefix),
            );
        } else
          valid =
            (specifier === "server-only" && owner.layer !== "domain") ||
            (specifier === "zod" &&
              owner.layer === "presentation" &&
              source.endsWith("/presentation/validation.server.ts"));
      }
      if (!valid)
        context.report({
          node,
          messageId: "forbidden",
          data: { source, target },
        });
      if (!targetFile || !target.startsWith("src/")) return;
      const seen = new Set();
      function reachesCurrent(current) {
        if (current === file) return true;
        if (seen.has(current)) return false;
        seen.add(current);
        return imports(current).some((edge) => {
          const next = resolveImport(current, edge, root);
          return (
            next &&
            location(next, root).startsWith("src/") &&
            reachesCurrent(next)
          );
        });
      }
      if (reachesCurrent(targetFile))
        context.report({ node, messageId: "cycle", data: { target } });
    }
    function declaration(node) {
      if (!node.source) return;
      const typeOnly =
        node.importKind === "type" ||
        node.exportKind === "type" ||
        (node.specifiers?.length > 0 &&
          node.specifiers.every(
            (entry) =>
              entry.importKind === "type" || entry.exportKind === "type",
          ));
      check(node, node.source.value, typeOnly);
    }
    function expression(node, argument) {
      if (argument?.type === "Literal" && typeof argument.value === "string")
        check(node, argument.value);
      else if (owner || isCore) context.report({ node, messageId: "dynamic" });
    }
    return {
      ImportDeclaration: declaration,
      ExportNamedDeclaration: declaration,
      ExportAllDeclaration: declaration,
      ImportExpression(node) {
        expression(node, node.source);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require")
          expression(node, node.arguments[0]);
      },
      TSImportType(node) {
        const literal = node.argument?.literal ?? node.argument ?? node.source;
        if (literal?.type === "Literal") check(node, literal.value, true);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type === "TSExternalModuleReference")
          check(node, node.moduleReference.expression.value);
      },
    };
  },
};
