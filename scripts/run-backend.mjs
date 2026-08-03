#!/usr/bin/env node
// Runs the backend via its virtual environment's Python, cross-platform (the venv's
// binary lives at a different relative path on Windows vs macOS/Linux). Pass --reload
// for the dev server (auto-restarts on file changes); omit it for a production-style
// run, matching `uvicorn main:app --reload` / `uvicorn main:app` respectively.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { platform } from "node:process";

const isWindows = platform === "win32";
// Absolute path, deliberately - spawnSync resolves a relative `command` against the
// *caller's* cwd, not the `cwd` option passed to it (which only affects the spawned
// process's working directory) - a relative "backend/venv/.../python.exe" combined
// with cwd: "backend" below would otherwise resolve to the wrong, doubled-up path.
const venvPython = resolve(process.cwd(), "backend", "venv", isWindows ? "Scripts/python.exe" : "bin/python");

if (!existsSync(venvPython)) {
  console.error(
    `\nBackend virtual environment not found at ${venvPython}\n` +
    "Run `npm run install:all` first (see README.md for details).\n"
  );
  process.exit(1);
}

const reload = process.argv.includes("--reload");
const port = process.env.PORT || "8000";
const args = ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port];
if (reload) args.push("--reload");

console.log(`Starting backend on http://localhost:${port} (health check: /api/health)${reload ? " [auto-reload]" : ""}`);
const result = spawnSync(venvPython, args, { stdio: "inherit", cwd: "backend" });
if (result.error) {
  console.error(`\nFailed to start the backend: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 0);
