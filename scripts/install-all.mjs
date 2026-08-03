#!/usr/bin/env node
// Cross-platform "install everything" for a fresh clone/ZIP-extract: frontend npm
// dependencies, plus a backend Python virtual environment with its dependencies.
// A single Node script (rather than separate .sh/.bat files) so the same logic runs
// identically on Windows, macOS, and Linux without duplication or Unix-only syntax.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:process";

import { findPython, printPythonNotFoundError } from "./find-python.mjs";

const isWindows = platform === "win32";

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: isWindows, ...opts });
  if (result.error) {
    console.error(`\nFailed to run "${cmd}": ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\nCommand failed (exit code ${result.status}): ${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

console.log("=== 1/3: Installing frontend dependencies (frontend/) ===");
run("npm", ["install"], { cwd: "frontend" });

console.log("\n=== 2/3: Setting up the backend virtual environment (backend/venv) ===");
const venvDir = "backend/venv";
if (existsSync(venvDir)) {
  console.log("backend/venv already exists - skipping creation (delete the folder to recreate it).");
} else {
  const python = findPython();
  if (!python) {
    printPythonNotFoundError();
    process.exit(1);
  }
  console.log(`Using "${python}" to create the virtual environment.`);
  const [bin, ...extraArgs] = python.split(" ");
  run(bin, [...extraArgs, "-m", "venv", "venv"], { cwd: "backend" });
}

console.log("\n=== 3/3: Installing backend dependencies ===");
const venvPython = isWindows ? "venv\\Scripts\\python.exe" : "venv/bin/python";
if (!existsSync(`backend/${venvPython}`)) {
  console.error(
    `\nExpected a virtual environment Python at backend/${venvPython} but it's missing.\n` +
    "The venv may have failed to create - delete backend/venv and run this command again.\n"
  );
  process.exit(1);
}
run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { cwd: "backend" });
run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], { cwd: "backend" });

console.log(
  "\nAll dependencies installed.\n\n" +
  "Next steps (both optional - the app runs with defaults otherwise):\n" +
  "  - Copy backend/.env.example to backend/.env to customise backend settings.\n" +
  "  - Copy frontend/.env.local.example to frontend/.env.local if your backend won't run\n" +
  "    on the default http://localhost:8000.\n\n" +
  "Then run:  npm run dev\n"
);
