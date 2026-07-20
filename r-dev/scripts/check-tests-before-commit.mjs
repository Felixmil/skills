#!/usr/bin/env node
// Guardrail: never let a commit record a red test suite. This is a PreToolUse
// hook on `git commit`: before the commit runs, it executes the full test suite
// and blocks (exit 2) if any test fails, so broken code never enters history.
//
// Why commit (not every edit, not every push): the tight edit/test loop during
// implementation runs only the relevant test files (see the r-pkg-dev skill's
// Agent workflow); the full suite is reserved for the commit boundary, which is
// infrequent, so the cost is paid rarely. This closes the case of an agent
// committing code that did not pass the suite locally.
//
// The gate runs regardless of git flags: `git commit --no-verify` bypasses git's
// own pre-commit hooks, but this Claude hook still fires and still blocks. A
// human committing from a terminal is unaffected (that is not a Claude tool call).
//
// Deliberate escape hatch: prefixing the command with the env var
// `R_PKG_GATE_SKIP=1` (e.g. `R_PKG_GATE_SKIP=1 git commit -m wip`) bypasses this
// gate for that one commit. It is detected from the command string (the var is
// set inline on git, so it is not in the hook's own environment) and announced
// on stderr, so a bypass is always a conscious, visible choice.
//
// No-op (allows the commit) when the gate does not apply: the command is not a
// real `git commit`, the working directory is not inside an R package with a
// testthat suite, or Rscript/devtools are unavailable. It also skips commits
// that cannot affect the suite, decided from a cheap `git diff --cached`:
//   - the commit records no R-relevant change (only docs, CI config, .github/,
//     LICENSE, etc.; see isRRelevantPath),
//   - a message-only `--amend` (no staged content changes),
//   - an explicitly empty commit (`--allow-empty`) or one that stages nothing.
// When it does apply it runs the full suite with NOT_CRAN=true, however long
// that takes.
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
  isRRelevantPath,
  findUp,
  block,
  existsSync,
  readFileSync,
  join,
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
    "r-dev: commit gate bypassed via R_PKG_GATE_SKIP (test suite NOT run).\n",
  );
  process.exit(0);
}

// Find the package root: nearest directory at/above CWD with a DESCRIPTION.
const pkgRoot = findUp(cwd, (dir) => existsSync(join(dir, "DESCRIPTION")));
if (!pkgRoot) process.exit(0);

// Must actually be an R package (DESCRIPTION with a Package: field) with a
// testthat suite; otherwise there is nothing to gate.
if (!/^Package:\s*[A-Za-z]/m.test(safeRead(join(pkgRoot, "DESCRIPTION"))))
  process.exit(0);
const testDir = join(pkgRoot, "tests", "testthat");
if (!existsSync(testDir)) process.exit(0);
// No test files -> nothing to run.
if (!hasTestFiles(testDir)) process.exit(0);

// Skip the suite when this commit cannot affect what the suite sees. This is a
// cheap git inspection done before probing for Rscript/devtools, so a docs-only
// or empty commit costs nothing. The rule is conservative: only skip when we can
// prove the commit is irrelevant or a no-op; if git cannot answer, run the gate.
{
  const amend = /\s--amend(\s|$)/.test(cmd);
  const allowEmpty = /\s--allow-empty(\s|$)/.test(cmd);
  // `-a`/`--all` (and `-am`) also commit tracked-but-unstaged modifications, so
  // the effective set is staged + tracked-unstaged. Otherwise only the index.
  const stageAll = /\s(-a|--all|-[a-z]*a[a-z]*)(\s|$)/.test(cmd);

  // Files already staged in the index. `ok` is false when git itself failed
  // (not a git repo, etc.); on failure we do not trust an empty result and fall
  // through to running the gate rather than skip on bad data.
  const stagedRes = gitLines(cwd, ["diff", "--cached", "--name-only"]);
  // With -a, also the tracked files modified but not staged.
  const trackedUnstaged = stageAll
    ? gitLines(cwd, ["diff", "--name-only"]).files
    : [];
  // `--amend` rewrites HEAD, so its recorded change is the previous commit's own
  // diff plus anything newly staged. Without those files the amend only rewords
  // the message and the tree is unchanged.
  const amended = amend
    ? gitLines(cwd, ["diff", "--name-only", "HEAD~1", "HEAD"]).files
    : [];
  const files = [
    ...new Set([...stagedRes.files, ...trackedUnstaged, ...amended]),
  ];

  // Only reason about "nothing to record" when the staged-diff query actually
  // succeeded. `--amend` with an unchanged tree is a message-only amend; a plain
  // commit with an empty set stages nothing; `--allow-empty` is an explicit
  // empty commit. In all three the tree is unchanged, so the suite cannot
  // regress -> skip.
  if (
    stagedRes.ok &&
    files.length === 0 &&
    (amend || allowEmpty || stagedRes.files.length === 0)
  ) {
    process.exit(0);
  }

  // Files resolved but none can affect the suite (docs, CI config, .github/,
  // LICENSE, etc.) -> skip. An empty `files` with no amend/allow-empty flag is
  // left to git itself (it will error "nothing to commit"), so we do not skip
  // it here as R-irrelevant.
  if (files.length > 0 && !files.some(isRRelevantPath)) {
    process.exit(0);
  }
}

if (!onPath("Rscript")) process.exit(0);
// devtools must be installed for the run to be meaningful.
if (
  run("Rscript", [
    "-e",
    'quit(status = if (requireNamespace("devtools", quietly = TRUE)) 0L else 1L)',
  ]).status !== 0
)
  process.exit(0);

process.stderr.write(
  "Running the full test suite before commit (r-dev gate)...\n",
);

// Run the suite with NOT_CRAN=true so CRAN-gated tests, snapshots, and skips are
// not silently dropped. stop_on_failure = FALSE so all tests run; we inspect the
// aggregate result and exit non-zero when anything failed. The "llm" reporter
// (testthat >= 3.3.2) prints nothing for passing tests and one compact block per
// problem, so the blocked-commit message stays small; fall back to "summary" on
// older testthat where "llm" does not exist.
const { out, status } = run(
  "Rscript",
  [
    "-e",
    `
  reporter <- if (utils::packageVersion("testthat") >= "3.3.2") "llm" else "summary"
  res <- devtools::test(reporter = reporter, stop_on_failure = FALSE)
  df <- as.data.frame(res)
  n_fail <- sum(df$failed) + sum(df$error)
  if (n_fail > 0) quit(status = 1L)
`,
  ],
  { cwd: pkgRoot, env: { NOT_CRAN: "true" } },
);

if (status !== 0) {
  block(
    [
      "Commit blocked: the test suite is not green.",
      "",
      out.trimEnd(),
      "",
      "Fix the failing tests (run the relevant test file with",
      "testthat::test_file() while iterating), get the suite green,",
      "then commit again.",
    ].join("\n"),
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

function hasTestFiles(dir) {
  try {
    return readdirSync(dir).some((f) => /^test-.*\.R$/.test(f));
  } catch {
    return false;
  }
}

// Run a git command and return { files, ok }: `files` is stdout as a list of
// non-empty path lines, `ok` is whether git exited 0. A caller distinguishes
// "git succeeded and there are no files" (ok:true, files:[]) from "git failed"
// (ok:false) so it can run the gate rather than skip on bad data.
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
