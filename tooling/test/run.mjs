import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? discover(file)
      : /\.test\.(ts|mjs)$/.test(entry.name)
        ? [file]
        : [];
  });
}
const files = [
  ...discover(path.join(root, "src/tests")),
  ...discover(path.join(root, "tooling/eslint")),
].sort();
if (!files.length) throw new Error("No test suites discovered");
const runner = spawn(
  process.execPath,
  [
    "--conditions=react-server",
    "--import",
    "tsx",
    "--test",
    "--test-concurrency=1",
    ...files,
  ],
  { cwd: root, stdio: "inherit" },
);
runner.on("error", () => {
  console.error("Unable to start test runner");
  process.exitCode = 1;
});
runner.on("close", (code) => {
  process.exitCode = code ?? 1;
});
