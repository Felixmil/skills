#!/usr/bin/env node
// Guardrail: keep man/ in sync with roxygen comments, checked once at the commit
// boundary. This is a PreToolUse hook on `git commit`: before the commit runs, if
// the committed changes touch roxygen sources under R/ and the generated
// documentation is stale, it blocks (exit 2) so devtools::document() is run before
// the commit records out-of-date man pages.
//
// Why commit (not every edit): during implementation an .R file is edited many
// times before its docs are worth regenerating, so a per-edit block interrupts the
// tight edit loop repeatedly for docs that are about to change again. The commit
// boundary is infrequent, so paying the (fast) docs check there catches stale docs
// exactly once, when it matters. The r-pkg-dev skill still tells the agent to
// document() after changing roxygen/exports; this gate is the backstop.
//
// Speed: the primary check is roxygen2::needs_roxygenize(), a fast built-in that
// compares each man/*.Rd against the mtime of the R file recorded in its
// provenance header ("% Please edit documentation in R/foo.R"). It never evaluates
// the code in R/, so it does not scale with package size (~0.3s, R startup
// dominated), unlike a full devtools::document().
//
// needs_roxygenize() has one blind spot this hook closes: it only iterates
// EXISTING man/*.Rd files, so a brand-new R file with fresh roxygen and no .Rd yet
// is not detected. For each committed R file under R/ that carries roxygen but has
// no .Rd backref, this hook flags that too.
//
// NAMESPACE staleness (from adding/removing @export, @import, etc.) is not checked
// here: a cheap check would be too noisy. The r-pkg-dev skill covers it by
// telling the agent to document() after changing export/import tags.
//
// The gate runs regardless of git flags: `git commit --no-verify` bypasses git's
// own hooks, but this Claude hook still fires. A human committing from a terminal
// is unaffected (that is not a Claude tool call).
//
// Deliberate escape hatch: prefixing the command with `R_PKG_GATE_SKIP=1` (e.g.
// `R_PKG_GATE_SKIP=1 git commit -m wip`) bypasses this gate for that one commit. It
// is detected from the command string and announced on stderr, so a bypass is
// always a conscious, visible choice.
//
// No-op (allows the commit) when the gate does not apply: the command is not a
// real `git commit`, the working directory is not inside an R package, Rscript is
// unavailable, or the committed changes touch no roxygen-bearing R file under R/.
// It also skips commits that cannot change docs, decided from a cheap
// `git diff --cached`:
//   - a message-only `--amend` (no staged content changes),
//   - an explicitly empty commit (`--allow-empty`) or one that stages nothing,
//   - a commit whose files are all outside R/ (docs, tests, CI config, etc.).
//
// Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

import { readdirSync } from "node:fs";
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
  readFileSync,
  join,
  basename,
} from "./lib/hook.mjs";

const payload = readPayload();
const tool = payload?.tool_name || "";
const cmd = payload?.tool_input?.command || "";
const cwd = payloadCwd(payload);

if (tool !== "Bash") process.exit(0);

// Only gate an actual `git commit`. Match `git ... commit` as a subcommand so
// `git log --format=%h` or a message body containing the word "commit" does not
// trigger it. `git commit`, `git -C path commit`, and `git commit --no-verify`
// all match; `git commit --help` and `--dry-run` are allowed through.
if (!/(^|[;&|\s])git(\s+-[^;&|]*)?\s+commit(\s|$)/.test(cmd)) process.exit(0);
// A commit that would not actually record anything is not worth gating.
if (/\s(--help|-h|--dry-run)(\s|$)/.test(cmd)) process.exit(0);

// Deliberate escape hatch: `R_PKG_GATE_SKIP=1 git commit ...` bypasses the gate
// for this one commit. Announced loudly so the bypass is never silent.
if (gateBypassed(cmd)) {
  process.stderr.write(
    "r-dev: roxygen docs gate bypassed via R_PKG_GATE_SKIP (docs NOT checked).\n",
  );
  process.exit(0);
}

// Find the package root: nearest directory at/above CWD with a DESCRIPTION.
const pkgRoot = findUp(cwd, (dir) => existsSync(join(dir, "DESCRIPTION")));
if (!pkgRoot) process.exit(0);

// Must actually be an R package (DESCRIPTION with a Package: field).
if (!/^Package:\s*[A-Za-z]/m.test(safeRead(join(pkgRoot, "DESCRIPTION"))))
  process.exit(0);

// Resolve the files this commit would record. Mirrors the test gate: staged files
// (the index), plus tracked-but-unstaged when `-a`/`--all` is used, plus the prior
// commit's own files on `--amend`. `ok` is false when git itself failed; on
// failure we do not trust an empty result and fall through to running the gate.
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
// staged): the tree is unchanged, so docs cannot go stale here -> skip.
if (
  stagedRes.ok &&
  files.length === 0 &&
  (amend || allowEmpty || stagedRes.files.length === 0)
) {
  process.exit(0);
}

// Only roxygen sources under R/ can change what needs_roxygenize() sees. Restrict
// to committed .R files below an R/ directory (…/R/foo.R or …/R/sub/foo.R). When
// the git inspection succeeded and none qualify, there is nothing to check -> skip.
// (When git failed we do not skip on bad data; we run the gate below.)
const committedRFiles = files.filter(
  (p) => /\.[Rr]$/.test(p) && /(^|\/)R\//.test(p.replace(/\\/g, "/")),
);
if (stagedRes.ok && committedRFiles.length === 0) process.exit(0);

if (!onPath("Rscript")) process.exit(0);

// --- Gap check: a committed R file has roxygen but no man/*.Rd references it. ---
// A new .R file (or one whose docs were never generated) is not caught by
// needs_roxygenize(), which only iterates existing .Rd files. For each committed
// roxygen-bearing file under R/, look for any .Rd whose provenance header lists it.
const manDir = join(pkgRoot, "man");
const manEntries = existsSync(manDir)
  ? readdirSync(manDir).filter((e) => /\.Rd$/i.test(e))
  : [];

for (const rel of committedRFiles) {
  const abs = join(pkgRoot, rel);
  if (!existsSync(abs)) continue; // deleted/renamed away in the working tree
  const source = safeRead(abs);
  if (!/^\s*#'/m.test(source)) continue; // no roxygen -> nothing to document

  if (!hasBackref(basename(rel), manEntries)) {
    block(
      [
        `Commit blocked: roxygen docs may be missing for R/${basename(rel)}.`,
        "",
        "This file has roxygen comments but no man/*.Rd page references it, so its",
        "documentation has not been generated yet. Run devtools::document() to",
        "create the .Rd and update NAMESPACE, then commit again.",
      ].join("\n"),
    );
  }
}

// --- Primary check: fast roxygen2 staleness predicate over existing man pages. ---
const { out, status } = run(
  "Rscript",
  [
    "--vanilla",
    "-e",
    'if (isTRUE(roxygen2::needs_roxygenize("."))) quit(status = 1L)',
  ],
  { cwd: pkgRoot },
);

if (status !== 0) {
  block(
    [
      "Commit blocked: roxygen documentation is out of date",
      "(roxygen2::needs_roxygenize() reported stale man pages):",
      "",
      out.trim() ? `${out.trim()}\n` : "",
      "Run devtools::document() to regenerate man/ and NAMESPACE, then commit again.",
    ]
      .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
      .join("\n"),
  );
}

process.exit(0);

function safeRead(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

// Run a git command and return { files, ok } (see check-tests-before-commit).
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

// Whether any .Rd in `manEntries` lists `baseR` in its provenance header. The line
// is "% Please edit documentation in R/a.R, R/b.R"; match the file name as a token
// so R/foo.R does not match R/foobar.R.
function hasBackref(baseR, manEntries) {
  const escaped = baseR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const backref = new RegExp(
    `Please edit documentation in .*(^|[ ,/])${escaped}([ ,]|$)`,
    "m",
  );
  return manEntries.some((entry) =>
    backref.test(safeRead(join(manDir, entry))),
  );
}
