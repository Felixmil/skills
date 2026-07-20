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

// Whether a repo-relative path is "R-relevant": changing it can change what the
// test suite or R CMD check sees. Anything else (docs, CI config, .github/,
// LICENSE, .Rbuildignore, .gitignore, etc.) cannot, so a commit/push touching
// only such files is safe to let through without running the expensive R gate.
//
// Deliberately broad on the include side: source and tests (.R/.r/.Rmd/.qmd/
// .Rnw), package metadata (DESCRIPTION, NAMESPACE), the `_pkgdown.yml` config,
// and the package subdirectories R CMD check reads (src/, inst/, vignettes/,
// data/, data-raw/, po/, tests/, man/, pkgdown/). When in doubt a path is
// treated as relevant, so the gate errs toward running, never toward skipping a
// real check.
export function isRRelevantPath(path) {
  const p = path.replace(/\\/g, "/");
  const base = p.slice(p.lastIndexOf("/") + 1);
  if (/\.(R|r|Rmd|rmd|qmd|Rnw|rnw)$/.test(base)) return true;
  if (base === "DESCRIPTION" || base === "NAMESPACE") return true;
  if (base === "_pkgdown.yml" || base === "_pkgdown.yaml") return true;
  // A leading directory segment that R CMD check / testthat reads. Matches the
  // segment at the repo root ("R/foo") or nested under a package subdir in a
  // monorepo ("pkg/R/foo").
  if (
    /(^|\/)(R|src|inst|vignettes|data|data-raw|po|tests|man|pkgdown)\//.test(p)
  )
    return true;
  return false;
}

export { existsSync, readFileSync, join, basename, dirname };
