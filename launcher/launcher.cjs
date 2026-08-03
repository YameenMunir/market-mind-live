#!/usr/bin/env node
"use strict";

// Market Mind Live - desktop launcher.
//
// Double-click convenience wrapper around `npm run start`: starts the backend and
// frontend together, waits for both to come up, opens your browser to the app, and
// stops both cleanly when this window is closed. This does NOT bundle Node.js/Python
// or either app's dependencies - it still requires you to have already run
// `npm run install:all` (and it's happy to run `npm run build` for you once, the
// first time, if you haven't built the frontend yet). See README.md's "Desktop
// launcher" section for what this does and doesn't do, and why.
//
// CommonJS (not the .mjs style used by scripts/*.mjs elsewhere in this repo)
// deliberately - this file is the entry point compiled into MarketMindLive.exe via
// @yao-pkg/pkg (see package.json's "build:exe" script), and pkg's bundler has the
// most reliable, best-documented support for a single self-contained CommonJS file.

const { spawn, execFile, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const BACKEND_PORT = process.env.PORT || "8000";
const FRONTEND_PORT = process.env.FRONTEND_PORT || "3000";
const HEALTH_TIMEOUT_MS = 90_000;

function log(message) {
  console.log(`[launcher] ${message}`);
}

function fail(message) {
  console.error(`\n[launcher] ${message}\n`);
  console.error("Press any key to close this window...");
  try {
    // Keeps the console window open on a double-clicked .exe so the error is
    // actually readable, instead of the window flashing shut immediately.
    execFileSync("cmd", ["/c", "pause>nul"], { stdio: "inherit" });
  } catch {
    // Not fatal if this itself fails (e.g. not actually running interactively) -
    // the error message above has already been printed either way.
  }
  process.exit(1);
}

// pkg exposes `process.pkg` inside a compiled executable; `process.execPath` is then
// the real, on-disk path to the .exe itself (unlike `__dirname`, which points inside
// pkg's virtual, read-only snapshot filesystem and can't be used to find the real
// backend/frontend folders sitting next to the .exe on disk). Running this file
// directly with `node launcher/launcher.cjs` (for testing the launcher itself) has no
// such snapshot, so `__dirname`'s parent (the repo root) is correct there instead.
const appRoot = process.pkg ? path.dirname(process.execPath) : path.resolve(__dirname, "..");

function requireAppRoot() {
  const markers = ["package.json", "backend", "frontend"];
  const missing = markers.filter((m) => !fs.existsSync(path.join(appRoot, m)));
  if (missing.length > 0) {
    fail(
      `This doesn't look like a Market Mind Live folder: ${appRoot}\n` +
      "Move MarketMindLive.exe into the project's root folder (the one containing " +
      "package.json, backend/, and frontend/) and run it from there."
    );
  }
}

function requireInstalled() {
  const venvPython = path.join(appRoot, "backend", "venv", "Scripts", "python.exe");
  const frontendDeps = path.join(appRoot, "frontend", "node_modules");
  const missing = [];
  if (!fs.existsSync(venvPython)) missing.push("backend/venv (Python virtual environment)");
  if (!fs.existsSync(frontendDeps)) missing.push("frontend/node_modules");
  if (missing.length > 0) {
    fail(
      "Market Mind Live hasn't been set up yet - missing:\n" +
      missing.map((m) => `  - ${m}`).join("\n") +
      "\n\nOpen a terminal in this folder and run:\n  npm run install:all\n" +
      "then run this launcher again."
    );
  }
  return venvPython;
}

function ensureFrontendBuilt() {
  const buildMarker = path.join(appRoot, "frontend", ".next", "BUILD_ID");
  if (fs.existsSync(buildMarker)) return;

  log("First run: building the frontend (this takes a minute or two)...");
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = require("node:child_process").spawnSync(npmCmd, ["run", "build"], {
    cwd: path.join(appRoot, "frontend"),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail("The frontend build failed - see the output above for details.");
  }
}

const children = [];

function spawnTracked(command, args, options) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  children.push(child);
  return child;
}

function killAll() {
  for (const child of children) {
    if (child.killed || child.exitCode !== null) continue;
    if (process.platform === "win32") {
      // Plain child.kill() only signals the immediate process - on Windows, both
      // `npm.cmd` and `next start` spawn further child processes of their own, which
      // would otherwise survive as orphans. `taskkill /t` kills the whole tree.
      try {
        execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
      } catch {
        // Already exited - fine.
      }
    } else {
      child.kill("SIGTERM");
    }
  }
}

function waitForHealthy(url, label) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(2000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`${label} did not become ready within ${HEALTH_TIMEOUT_MS / 1000}s.`));
        return;
      }
      setTimeout(attempt, 1000);
    };
    attempt();
  });
}

function openBrowser(url) {
  // execFile with an argument array, not exec() with an interpolated string - no
  // shell involved, so nothing in `url` (built from FRONTEND_PORT, which is only an
  // env var away from being attacker-influenced) can be interpreted as extra shell
  // commands/metacharacters.
  if (process.platform === "win32") {
    // cmd.exe's `start` needs an explicit empty-string "window title" argument before
    // the URL - without it, `start` treats a quoted first argument as the title
    // instead of the target to open.
    execFile("cmd", ["/c", "start", "", url]);
  } else if (process.platform === "darwin") {
    execFile("open", [url]);
  } else {
    execFile("xdg-open", [url]);
  }
}

async function main() {
  log(`Market Mind Live - starting from ${appRoot}`);
  requireAppRoot();
  const venvPython = requireInstalled();
  ensureFrontendBuilt();

  log("Starting backend...");
  spawnTracked(venvPython, ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", BACKEND_PORT], {
    cwd: path.join(appRoot, "backend"),
  });

  log("Starting frontend...");
  const nextBin = path.join(
    appRoot, "frontend", "node_modules", ".bin",
    process.platform === "win32" ? "next.cmd" : "next"
  );
  spawnTracked(nextBin, ["start", "-p", FRONTEND_PORT], {
    cwd: path.join(appRoot, "frontend"),
    shell: process.platform === "win32",
  });

  log("Waiting for both to come up...");
  try {
    await Promise.all([
      waitForHealthy(`http://127.0.0.1:${BACKEND_PORT}/api/health`, "Backend"),
      waitForHealthy(`http://127.0.0.1:${FRONTEND_PORT}/`, "Frontend"),
    ]);
  } catch (err) {
    killAll();
    fail(`${err.message}\nCheck the output above for the actual error from whichever side failed.`);
    return;
  }

  const url = `http://localhost:${FRONTEND_PORT}`;
  log(`Market Mind Live is running at ${url}`);
  log("Opening your browser. Press Ctrl+C in this window to stop the app.");
  openBrowser(url);
}

process.on("SIGINT", () => {
  log("Stopping...");
  killAll();
  process.exit(0);
});
process.on("exit", killAll);

main().catch((err) => {
  killAll();
  fail(err.stack || String(err));
});
