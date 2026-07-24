// Shared helpers for the r-dev guardrail hooks.
//
// The hooks are Node scripts (not shell) so they run identically on macOS,
// Linux, and native Windows: Claude Code ships Node on every platform, whereas
// a POSIX shell and tools like `jq`/`grep` are not guaranteed on Windows. Each
// helper here avoids anything platform-specific (no shelling out to `grep`, no
// hardcoded path separators).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";

// Read the whole hook payload from stdin and parse it as JSON. Returns {} when
// stdin is empty or not valid JSON, so a malformed payload degrades to a no-op
// rather than throwing.
export function readPayload() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return {};
  }
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

// The edited file path, from the tool response first, then the tool input.
// Mirrors the previous `jq '.tool_response.filePath // .tool_input.file_path'`.
export function editedFilePath(payload) {
  return (
    payload?.tool_response?.filePath || payload?.tool_input?.file_path || ""
  );
}

// The working directory the tool ran in, falling back to the process CWD.
export function cwd(payload) {
  return payload?.cwd || process.cwd();
}

// Whether `bin` resolves on PATH, cross-platform. `command -v` does not exist on
// Windows; `spawnSync` with `shell:false` uses the OS PATH lookup (including
// PATHEXT on Windows, so `Rscript`/`air` resolve to `.exe`/`.bat`). A version or
// help flag that exits without side effects is enough to prove the binary runs.
export function onPath(bin, probeArgs = ["--version"]) {
  const res = spawnSync(bin, probeArgs, { stdio: "ignore" });
  return !res.error;
}

// Run a command, capturing combined stdout+stderr and the exit status. Used for
// the R-based checks. `cwd` sets the working directory; `env` is merged over the
// current environment (e.g. NOT_CRAN=true).
export function run(bin, args, { cwd, env } = {}) {
  const res = spawnSync(bin, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  // res.status is null when the process was killed by a signal or failed to
  // spawn; treat that as a non-zero (failed) status.
  const status = res.error ? 1 : res.status === null ? 1 : res.status;
  return { out, status };
}

// Walk up from `startDir` (inclusive) to the filesystem root, returning the
// first directory for which `predicate(dir)` is true, or "" if none match.
export function findUp(startDir, predicate) {
  let dir = startDir;
  while (dir) {
    if (predicate(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break; // reached the root
    dir = parent;
  }
  return "";
}

// Emit a blocking message on stderr and exit 2 (the Claude Code "block" signal).
export function block(message) {
  process.stderr.write(message.endsWith("\n") ? message : `${message}\n`);
  process.exit(2);
}

// Exit 0 (allow). A bare re-export for readability at call sites.
export function allow() {
  process.exit(0);
}

// Surface a one-line status to the user on an allow (exit 0) path. A PreToolUse
// hook's stderr is hidden when it exits 0 (it goes only to the debug log), so a
// plain stderr write is invisible on success. A JSON object with a systemMessage
// field on stdout IS shown to the user. Callers still exit 0 themselves after.
export function notify(message) {
  process.stdout.write(`${JSON.stringify({ systemMessage: message })}\n`);
}

// Run git in `cwd` and return { out, status }, mirroring run(). Never throws:
// a spawn failure yields status 1 so callers can decide. Used by the
// commit/push gates to inspect what a commit/push would actually touch.
export function git(cwd, args) {
  return run("git", args, { cwd });
}

// Deliberate escape hatch for the commit/push gates: setting the env var
// R_PKG_GATE_SKIP to a truthy value bypasses the gate for that one command. It
// is read from the command STRING (not process.env) because it is set inline on
// the git invocation (`R_PKG_GATE_SKIP=1 git commit ...`), so it lives in git's
// environment, not the hook's. Truthy = anything but empty / 0 / false / no.
// Deliberately awkward to type and printed loudly by the caller, so it is a
// conscious choice, never a reflex. Matched anywhere in the command (like the
// gates' coarse `git commit`/`git push` matching), so a commit message that
// literally contains `R_PKG_GATE_SKIP=1` would also trip it; that is a non-issue
// in practice and avoids parsing shell word positions.
export function gateBypassed(cmd) {
  const m = /(^|[;&|\s])R_PKG_GATE_SKIP=(["']?)([^\s"';&|]*)\2(\s|$)/.exec(
    cmd || "",
  );
  if (!m) return false;
  const val = m[3];
  return !/^(|0|false|no)$/i.test(val);
}

export { existsSync, readFileSync, join, basename };
