// Locates a working Python 3.12+ interpreter across Windows/macOS/Linux, where the
// right command name varies ("python" vs "python3", or the Windows "py" launcher) and
// a plain "python" on some systems still points at Python 2 or isn't on PATH at all.
import { spawnSync } from "node:child_process";

const CANDIDATES = process.platform === "win32"
  ? ["python", "py -3.12", "py -3"]
  : ["python3.12", "python3", "python"];

function versionOf(cmd) {
  const [bin, ...args] = cmd.split(" ");
  const result = spawnSync(bin, [...args, "--version"], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout && !result.stderr) return null;
  // Some Python builds print the version to stderr rather than stdout.
  const text = `${result.stdout || ""}${result.stderr || ""}`;
  const match = text.match(/Python (\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function findPython() {
  for (const candidate of CANDIDATES) {
    const version = versionOf(candidate);
    if (version && (version.major > 3 || (version.major === 3 && version.minor >= 12))) {
      return candidate;
    }
  }
  return null;
}

export function printPythonNotFoundError() {
  console.error(
    "\nCould not find a Python 3.12+ interpreter on your PATH.\n" +
    "Market Mind Live's backend requires Python 3.12 or newer.\n\n" +
    "Install it from https://www.python.org/downloads/ (Windows/macOS) or your OS package\n" +
    "manager (e.g. `sudo apt install python3.12` on Ubuntu), then run this command again.\n" +
    `Tried: ${CANDIDATES.join(", ")}\n`
  );
}
