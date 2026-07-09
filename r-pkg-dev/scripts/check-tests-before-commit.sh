#!/bin/bash
# Guardrail: never let a commit record a red test suite. This is a PreToolUse
# hook on `git commit`: before the commit runs, it executes the full test suite
# and blocks (exit 2) if any test fails, so broken code never enters history.
#
# Why commit (not every edit, not every push): the tight edit/test loop during
# implementation runs only the relevant test files (see the r-conventions skill's
# Agent workflow); the full suite is reserved for the commit boundary, which is
# infrequent, so the cost is paid rarely. This closes the case of an agent
# committing code that did not pass the suite locally.
#
# The gate runs regardless of git flags: `git commit --no-verify` bypasses git's
# own pre-commit hooks, but this Claude hook still fires and still blocks. A
# human committing from a terminal is unaffected (that is not a Claude tool call).
#
# No-op (allows the commit) when the gate does not apply: the command is not a
# real `git commit`, the working directory is not inside an R package with a
# testthat suite, or Rscript/devtools are unavailable. When it does apply it
# always runs the full suite with NOT_CRAN=true, however long that takes.
#
# Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

INPUT=$(cat)

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
CWD=${CWD:-$PWD}

[ "$TOOL" = "Bash" ] || exit 0

# Only gate an actual `git commit`. Match `git ... commit` as a subcommand so
# `git log --format=%h` or a message body containing the word "commit" does not
# trigger it. `git commit`, `git -C path commit`, and `git commit --no-verify`
# all match; `git commit --help` and `--dry-run` are allowed through.
printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git([[:space:]]+-[^;&|]*)?[[:space:]]+commit([[:space:]]|$)' || exit 0
# A commit that would not actually record anything is not worth gating.
case "$CMD" in
  *" --help"* | *" -h"* | *" --dry-run"*) exit 0 ;;
esac

# Find the package root: nearest directory at/above CWD with a DESCRIPTION.
dir=$CWD
pkg_root=""
while [ -n "$dir" ] && [ "$dir" != "/" ]; do
  if [ -f "$dir/DESCRIPTION" ]; then
    pkg_root=$dir
    break
  fi
  dir=$(dirname "$dir")
done
[ -n "$pkg_root" ] || exit 0

# Must actually be an R package (DESCRIPTION with a Package: field) with a
# testthat suite; otherwise there is nothing to gate.
grep -qE '^Package:[[:space:]]*[A-Za-z]' "$pkg_root/DESCRIPTION" 2>/dev/null || exit 0
[ -d "$pkg_root/tests/testthat" ] || exit 0
# No test files -> nothing to run.
ls "$pkg_root"/tests/testthat/test-*.R >/dev/null 2>&1 || exit 0

command -v Rscript >/dev/null 2>&1 || exit 0
# devtools must be installed for the run to be meaningful.
Rscript -e 'quit(status = if (requireNamespace("devtools", quietly = TRUE)) 0L else 1L)' >/dev/null 2>&1 || exit 0

echo "Running the full test suite before commit (r-pkg-dev gate)..." >&2

# Run the suite with NOT_CRAN=true so CRAN-gated tests, snapshots, and skips are
# not silently dropped. stop_on_failure = FALSE so all tests run; we inspect the
# aggregate result and exit non-zero when anything failed.
OUTPUT=$(cd "$pkg_root" && NOT_CRAN=true Rscript -e '
  res <- devtools::test(reporter = testthat::SummaryReporter$new())
  df <- as.data.frame(res)
  n_fail <- sum(df$failed) + sum(df$error)
  if (n_fail > 0) quit(status = 1L)
' 2>&1)
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "Commit blocked: the test suite is not green."
    echo
    printf '%s\n' "$OUTPUT"
    echo
    echo "Fix the failing tests (run the relevant test file with"
    echo "testthat::test_file() or the r-btw btw_tool_pkg_test tool while"
    echo "iterating), get the suite green, then commit again."
  } >&2
  exit 2
fi

exit 0
