#!/usr/bin/env node
// Runs the backend test suite via its virtual environment - installs the pytest-only
// dev dependency first (kept separate from requirements.txt so a normal install/run
// doesn't need it), matching the documented `pip install -r requirements-dev.txt &&
// pytest` flow but from the repo root and cross-platform.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { platform } from "node:process";

const isWindows = platform === "win32";
// Absolute path - see run-backend.mjs's comment for why (spawnSync resolves a
// relative `command` against the caller's cwd, not the `cwd` option below).
const venvPython = resolve(process.cwd(), "backend", "venv", isWindows ? "Scripts/python.exe" : "bin/python");

if (!existsSync(venvPython)) {
  console.error(
    `\nBackend virtual environment not found at ${venvPython}\n` +
    "Run `npm run install:all` first (see README.md for details).\n"
  );
  process.exit(1);
}

function run(args) {
  const result = spawnSync(venvPython, args, { stdio: "inherit", cwd: "backend" });
  if (result.error) {
    console.error(`\nFailed to run backend tests: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["-m", "pip", "install", "-q", "-r", "requirements-dev.txt"]);
run(["-m", "pytest"]);
