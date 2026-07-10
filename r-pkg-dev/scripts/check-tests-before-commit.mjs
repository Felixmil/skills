#!/usr/bin/env node
// Guardrail: never let a commit record a red test suite. This is a PreToolUse
// hook on `git commit`: before the commit runs, it executes the full test suite
// and blocks (exit 2) if any test fails, so broken code never enters history.
//
// Why commit (not every edit, not every push): the tight edit/test loop during
// implementation runs only the relevant test files (see the r-conventions skill's
// Agent workflow); the full suite is reserved for the commit boundary, which is
// infrequent, so the cost is paid rarely. This closes the case of an agent
// committing code that did not pass the suite locally.
//
// The gate runs regardless of git flags: `git commit --no-verify` bypasses git's
// own pre-commit hooks, but this Claude hook still fires and still blocks. A
// human committing from a terminal is unaffected (that is not a Claude tool call).
//
// No-op (allows the commit) when the gate does not apply: the command is not a
// real `git commit`, the working directory is not inside an R package with a
// testthat suite, or Rscript/devtools are unavailable. When it does apply it
// always runs the full suite with NOT_CRAN=true, however long that takes.
//
// Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

import { readdirSync } from "node:fs";
import {
  readPayload,
  cwd as payloadCwd,
  onPath,
  run,
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
  "Running the full test suite before commit (r-pkg-dev gate)...\n",
);

// Run the suite with NOT_CRAN=true so CRAN-gated tests, snapshots, and skips are
// not silently dropped. stop_on_failure = FALSE so all tests run; we inspect the
// aggregate result and exit non-zero when anything failed.
const { out, status } = run(
  "Rscript",
  [
    "-e",
    `
  res <- devtools::test(reporter = testthat::SummaryReporter$new())
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
      "testthat::test_file() or the r-btw btw_tool_pkg_test tool while",
      "iterating), get the suite green, then commit again.",
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
