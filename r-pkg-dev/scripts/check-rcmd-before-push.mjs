#!/usr/bin/env node
// Guardrail: do not push a package that fails R CMD check. This is a PreToolUse
// hook on `git push`: before the push runs, it runs R CMD check and blocks
// (exit 2) if the check reports any ERROR, so broken code does not leave the
// machine.
//
// Severity: blocks on ERRORs only. WARNINGs and NOTEs are reported but allowed
// through (a looser bar than CRAN, chosen to keep routine pushes unblocked). The
// commit gate already keeps the test suite green; this adds R CMD check at the
// push boundary, which is infrequent, so paying the (minutes-long) check cost
// here is acceptable.
//
// The gate runs regardless of git flags (e.g. `git push --force`); a human
// pushing from a terminal is unaffected (that is not a Claude tool call).
//
// No-op (allows the push) when the gate does not apply: the command is not a real
// `git push`, the working directory is not inside an R package, or
// Rscript/devtools are unavailable.
//
// Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

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

// Only gate an actual `git push`. Match `git ... push` as a subcommand so other
// commands (or a message containing "push") do not trigger it. `git push`,
// `git -C path push`, and `git push --force` all match; `git push --help` and
// `--dry-run` are allowed through.
if (!/(^|[;&|\s])git(\s+-[^;&|]*)?\s+push(\s|$)/.test(cmd)) process.exit(0);
// A push that would not actually publish anything is not worth gating.
if (/\s(--help|-h|--dry-run)(\s|$)/.test(cmd)) process.exit(0);

// Find the package root: nearest directory at/above CWD with a DESCRIPTION.
const pkgRoot = findUp(cwd, (dir) => existsSync(join(dir, "DESCRIPTION")));
if (!pkgRoot) process.exit(0);

// Must actually be an R package (DESCRIPTION with a Package: field).
if (!/^Package:\s*[A-Za-z]/m.test(safeRead(join(pkgRoot, "DESCRIPTION"))))
  process.exit(0);

if (!onPath("Rscript")) process.exit(0);
if (
  run("Rscript", [
    "-e",
    'quit(status = if (requireNamespace("devtools", quietly = TRUE)) 0L else 1L)',
  ]).status !== 0
)
  process.exit(0);

process.stderr.write(
  "Running R CMD check before push (r-pkg-dev gate). This can take a few minutes...\n",
);

// Run the check quietly and inspect the result object. devtools::check() returns
// an rcmdcheck object with $errors, $warnings, $notes (character vectors). Block
// only when there are errors; report warnings/notes but let the push proceed.
const { out, status } = run(
  "Rscript",
  [
    "-e",
    `
  res <- devtools::check(quiet = TRUE, error_on = "never")
  ne <- length(res$errors); nw <- length(res$warnings); nn <- length(res$notes)
  cat(sprintf("R CMD check: %d error(s), %d warning(s), %d note(s).\\n", ne, nw, nn))
  if (ne > 0) {
    cat("\\n--- ERRORS ---\\n")
    cat(res$errors, sep = "\\n")
    quit(status = 1L)
  }
`,
  ],
  { cwd: pkgRoot, env: { NOT_CRAN: "true" } },
);

if (status !== 0) {
  block(
    [
      "Push blocked: R CMD check reported errors.",
      "",
      out.trimEnd(),
      "",
      "Fix the R CMD check errors (run devtools::check() to reproduce),",
      "then push again.",
    ].join("\n"),
  );
}

// Surface warnings/notes without blocking, so they are visible but not a gate.
if (out.trim()) process.stderr.write(`${out.trimEnd()}\n`);

process.exit(0);

function safeRead(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
