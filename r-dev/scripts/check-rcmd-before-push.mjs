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
// Deliberate escape hatch: prefixing the command with the env var
// `R_PKG_GATE_SKIP=1` (e.g. `R_PKG_GATE_SKIP=1 git push`) bypasses this gate for
// that one push. It is detected from the command string (the var is set inline
// on git, so it is not in the hook's own environment) and announced on stderr,
// so a bypass is always a conscious, visible choice.
//
// No-op (allows the push) when the gate does not apply: the command is not a
// real `git push`, the working directory is not inside an R package, or
// Rscript/devtools are unavailable. It also skips pushes that cannot ship an
// R-relevant change, decided from a cheap `git diff @{push}..HEAD`:
//   - a branch deletion (no package files shipped),
//   - the pushed commits touch no R-relevant file (only docs, CI config, etc.;
//     see isRRelevantPath),
//   - nothing to push (already up to date; this also covers a pure `--tags`
//     push when the branch has no new commits).
// When git cannot resolve what is being pushed (new branch with no upstream, an
// explicit refspec, detached HEAD), the gate runs rather than guess.
//
// Pass cache: after the check passes, the fingerprint of HEAD's R-relevant
// content is stored (see lib/hook.mjs). A later push whose HEAD ships
// byte-identical R content skips the re-run, so a re-push after a failed
// follow-up (a rejected `gh pr create`, a retried push) does not re-run the
// minutes-long check. New commits change HEAD's tree, so the check runs again.
//
// Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

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
  cachedPass,
  recordPass,
  contentFingerprint,
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

// Deliberate escape hatch: `R_PKG_GATE_SKIP=1 git push ...` bypasses the gate
// for this one push. Announced loudly so the bypass is never silent.
if (gateBypassed(cmd)) {
  process.stderr.write(
    "r-dev: push gate bypassed via R_PKG_GATE_SKIP (R CMD check NOT run).\n",
  );
  process.exit(0);
}

// Find the package root: nearest directory at/above CWD with a DESCRIPTION.
const pkgRoot = findUp(cwd, (dir) => existsSync(join(dir, "DESCRIPTION")));
if (!pkgRoot) process.exit(0);

// Must actually be an R package (DESCRIPTION with a Package: field).
if (!/^Package:\s*[A-Za-z]/m.test(safeRead(join(pkgRoot, "DESCRIPTION"))))
  process.exit(0);

// Skip the check when this push cannot ship an R-relevant change. Decided from
// a cheap git range diff before probing for Rscript/devtools. Conservative:
// only skip when we can prove the push is irrelevant or a no-op; whenever git
// cannot resolve what is being pushed, run the gate.
{
  // A branch deletion ships no package files. (`--tags` is intentionally not a
  // shortcut here: `git push --tags` can still carry unpushed branch commits, so
  // it is left to the range diff below, which skips only when the branch has no
  // new commits.)
  const deletesOnly = /\s--delete(\s|$)/.test(cmd) || /\s:[^\s]+/.test(cmd);
  if (deletesOnly) process.exit(0);

  // The commits being pushed: prefer the tracking-branch push target
  // (`@{push}`), fall back to the configured upstream (`@{upstream}`). Both
  // resolve to the remote-tracking ref, so `<ref>..HEAD` is exactly the commits
  // this push would publish. When neither resolves (new branch with no
  // upstream, an explicit refspec, detached HEAD), `range` stays "" and we run
  // the gate rather than guess.
  let range = "";
  if (git(cwd, ["rev-parse", "--abbrev-ref", "@{push}"]).status === 0) {
    range = "@{push}..HEAD";
  } else if (git(cwd, ["rev-parse", "--abbrev-ref", "@{upstream}"]).status === 0) {
    range = "@{upstream}..HEAD";
  }

  if (range) {
    const diff = git(cwd, ["diff", "--name-only", range]);
    if (diff.status === 0) {
      const files = diff.out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      // Nothing to push (already up to date), or nothing R-relevant -> skip.
      if (files.length === 0) process.exit(0);
      if (!files.some(isRRelevantPath)) process.exit(0);
    }
  }
}

// Fingerprint the R-relevant content that a push would ship. R CMD check reads
// the whole package tree, so the fingerprint is HEAD's R-relevant blobs
// (`git ls-tree -r HEAD`), not just the pushed range: two pushes with the same
// HEAD (e.g. a re-push after a failed `gh pr create`) ship identical content and
// must not re-run the minutes-long check. New commits change HEAD's tree, so the
// fingerprint differs and the check runs again. "" (detached HEAD, unborn branch)
// means "do not consult the cache" -> the check runs, the safe default.
let fingerprint = "";
{
  const tree = git(cwd, ["ls-tree", "-r", "HEAD"]);
  if (tree.status === 0) {
    fingerprint = contentFingerprint(
      tree.out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    );
  }
}

// Same R-relevant content already passed R CMD check -> skip the re-run.
if (fingerprint && cachedPass(pkgRoot, "rcmd") === fingerprint) {
  process.stderr.write(
    "r-dev: R CMD check gate skipped (identical R content already passed). Pushing.\n",
  );
  process.exit(0);
}

if (!onPath("Rscript")) process.exit(0);
if (
  run("Rscript", [
    "-e",
    'quit(status = if (requireNamespace("devtools", quietly = TRUE)) 0L else 1L)',
  ]).status !== 0
)
  process.exit(0);

process.stderr.write(
  "r-dev gate: running R CMD check before push. This can take a few minutes; the push waits until it finishes...\n",
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

// Passed (no errors): remember this exact R content so a re-push of the same
// HEAD skips the check.
if (fingerprint) recordPass(pkgRoot, "rcmd", fingerprint);

// Surface the result (warning/note counts) without blocking.
if (out.trim()) process.stderr.write(`${out.trimEnd()}\n`);

process.exit(0);

function safeRead(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
