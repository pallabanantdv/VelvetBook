import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { moduleEdges, projectTree, root } from "../architecture/inventory.mjs";

test("actual cross-module graph is type-only and acyclic", () => {
  const edges = moduleEdges();
  assert.ok(edges.length > 0);
  assert.equal(edges.filter((edge) => !edge.typeOnly).length, 0);
  const active = new Set();
  const done = new Set();
  function visit(node) {
    assert.equal(active.has(node), false, `Module cycle at ${node}`);
    if (done.has(node)) return;
    active.add(node);
    for (const edge of edges.filter((edge) => edge.from === node))
      visit(edge.to);
    active.delete(node);
    done.add(node);
  }
  edges.forEach((edge) => visit(edge.from));
});
test("published directory tree matches the complete authored-file inventory", () => {
  const document = fs.readFileSync(
    path.join(root, "docs/architecture/project-tree.md"),
    "utf8",
  );
  assert.ok(
    document.includes(projectTree()),
    "Regenerate the tree with node tooling/architecture/inventory.mjs --write",
  );
});
