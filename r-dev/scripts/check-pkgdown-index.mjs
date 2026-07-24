#!/usr/bin/env node
// Guardrail: keep the pkgdown reference index in sync with the package's
// exported topics, checked once at the commit boundary. A new export (added to
// NAMESPACE by devtools::document()) that is not listed in _pkgdown.yml makes
// `pkgdown::build_site()` fail in CI with "N topic(s) missing from index". This
// is a PreToolUse hook on `git commit`: before the commit runs, if the committed
// changes could move the index out of sync and pkgdown::check_pkgdown() reports a
// problem, it blocks (exit 2) so the mistake is fixed before it enters history.
//
// Why commit (not every edit / document()): the index only matters when a change
// is recorded, and exports churn freely during implementation. Paying the check
// once at the (infrequent) commit boundary catches a stale index exactly when it
// counts, without interrupting the edit loop. It sits on the same commit gate as
// the roxygen-docs check, so the two doc guardrails fire together.
//
// Trigger: the commit stages something that can change the reference index:
//   - _pkgdown.yml/.yaml (the index itself), or
//   - NAMESPACE (the export list check_pkgdown() reads), or
//   - any R/*.R file (its @export/@keywords roxygen drives NAMESPACE + the index).
// A commit touching none of these cannot move the index -> skip.
//
// No-op unless a _pkgdown.yml exists at/above the working directory, so this is
// silent in non-pkgdown packages and non-R projects.
//
// The gate runs regardless of git flags: `git commit --no-verify` bypasses git's
// own hooks, but this Claude hook still fires. A human committing from a terminal
// is unaffected (that is not a Claude tool call).
//
// Deliberate escape hatch: prefixing the command with `R_PKG_GATE_SKIP=1` bypasses
// this gate for that one commit, announced on stderr so a bypass is always visible.
//
// No-op (allows the commit) when the gate does not apply: the command is not a
// real `git commit`, no _pkgdown.yml exists, the config is not at an R package
// root, Rscript is unavailable, or the committed changes touch nothing that can
// affect the index. It also skips commits that cannot change anything (a
// message-only `--amend`, an explicitly empty commit, or one that stages nothing).
//
// Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

import {
  readPayload,
  cwd as payloadCwd,
  onPath,
  run,
  git,
  gateBypassed,
  findUp,
  block,
  existsSync,
  join,
} from "./lib/hook.mjs";

const payload = readPayload();
const tool = payload?.tool_name || "";
const cmd = payload?.tool_input?.command || "";
const cwd = payloadCwd(payload);

if (tool !== "Bash") process.exit(0);

// Only gate an actual `git commit` (same subcommand match as the roxygen gate, so
// `git log` or a message body containing "commit" does not trigger it).
if (!/(^|[;&|\s])git(\s+-[^;&|]*)?\s+commit(\s|$)/.test(cmd)) process.exit(0);
if (/\s(--help|-h|--dry-run)(\s|$)/.test(cmd)) process.exit(0);

// Deliberate escape hatch: `R_PKG_GATE_SKIP=1 git commit ...` bypasses the gate.
if (gateBypassed(cmd)) {
  process.stderr.write(
    "r-dev: pkgdown index gate bypassed via R_PKG_GATE_SKIP (index NOT checked).\n",
  );
  process.exit(0);
}

// pkgdown accepts _pkgdown.yml or _pkgdown.yaml, at the root or under pkgdown/.
const hasPkgdownConfig = (dir) =>
  existsSync(join(dir, "_pkgdown.yml")) ||
  existsSync(join(dir, "_pkgdown.yaml")) ||
  existsSync(join(dir, "pkgdown", "_pkgdown.yml")) ||
  existsSync(join(dir, "pkgdown", "_pkgdown.yaml"));

// Find the package root: the nearest directory at/above CWD holding a
// _pkgdown.yml. No _pkgdown.yml anywhere -> nothing to check, no-op.
const pkgRoot = findUp(cwd, hasPkgdownConfig);
if (!pkgRoot) process.exit(0);

// A pkgdown site needs a DESCRIPTION alongside the config; bail quietly if the
// _pkgdown.yml is not actually at an R package root.
if (!existsSync(join(pkgRoot, "DESCRIPTION"))) process.exit(0);

// Resolve the files this commit would record (mirrors the roxygen gate): staged
// files, plus tracked-but-unstaged when `-a`/`--all`, plus the prior commit's
// files on `--amend`. `ok` is false when git itself failed; on failure we do not
// trust an empty result and fall through to running the gate.
const amend = /\s--amend(\s|$)/.test(cmd);
const allowEmpty = /\s--allow-empty(\s|$)/.test(cmd);
const stageAll = /\s(-a|--all|-[a-z]*a[a-z]*)(\s|$)/.test(cmd);

const stagedRes = gitLines(cwd, ["diff", "--cached", "--name-only"]);
const trackedUnstaged = stageAll
  ? gitLines(cwd, ["diff", "--name-only"]).files
  : [];
const amended = amend
  ? gitLines(cwd, ["diff", "--name-only", "HEAD~1", "HEAD"]).files
  : [];
const files = [
  ...new Set([...stagedRes.files, ...trackedUnstaged, ...amended]),
];

// Nothing to record (message-only amend, explicit empty commit, or nothing
// staged): the tree is unchanged, so the index cannot go stale here -> skip.
if (
  stagedRes.ok &&
  files.length === 0 &&
  (amend || allowEmpty || stagedRes.files.length === 0)
) {
  process.exit(0);
}

// Only a change to the index config, the export list, or a roxygen source can
// move the reference index out of sync. When git succeeded and none of the
// committed files qualify, there is nothing to check -> skip. (When git failed we
// do not skip on bad data; we run the gate below.)
const affectsIndex = files.some((p) => {
  const norm = p.replace(/\\/g, "/");
  const name = norm.split("/").pop();
  return (
    name === "_pkgdown.yml" ||
    name === "_pkgdown.yaml" ||
    name === "NAMESPACE" ||
    (/\.[Rr]$/.test(norm) && /(^|\/)R\//.test(norm))
  );
});
if (stagedRes.ok && !affectsIndex) process.exit(0);

if (!onPath("Rscript")) process.exit(0);

// Run the check. check_pkgdown() errors (non-zero) when a topic is missing from
// or dangling in the index; it prints "No problems found." and exits 0 when the
// index is in sync. Capture output so we can hand the actual message back.
const { out, status } = run("Rscript", ["-e", 'pkgdown::check_pkgdown(".")'], {
  cwd: pkgRoot,
  env: { NOT_CRAN: "true" },
});

if (status !== 0) {
  block(
    [
      "Commit blocked: pkgdown reference index is out of sync",
      "(pkgdown::check_pkgdown() failed):",
      "",
      out.trimEnd(),
      "",
      "Fix _pkgdown.yml: add the missing topic(s) to the reference index",
      "(or mark the function @keywords internal to drop it from the index),",
      "then re-run devtools::document() and commit again.",
    ].join("\n"),
  );
}

process.exit(0);

// Run a git command and return { files, ok } (see check-roxygen-before-commit).
function gitLines(cwd, gitArgs) {
  const { out, status } = git(cwd, gitArgs);
  const files =
    status === 0
      ? out
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  return { files, ok: status === 0 };
}
