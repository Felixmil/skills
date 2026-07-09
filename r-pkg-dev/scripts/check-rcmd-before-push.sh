#!/bin/bash
# Guardrail: do not push a package that fails R CMD check. This is a PreToolUse
# hook on `git push`: before the push runs, it runs R CMD check and blocks
# (exit 2) if the check reports any ERROR, so broken code does not leave the
# machine.
#
# Severity: blocks on ERRORs only. WARNINGs and NOTEs are reported but allowed
# through (a looser bar than CRAN, chosen to keep routine pushes unblocked). The
# commit gate already keeps the test suite green; this adds R CMD check at the
# push boundary, which is infrequent, so paying the (minutes-long) check cost
# here is acceptable.
#
# The gate runs regardless of git flags (e.g. `git push --force`); a human
# pushing from a terminal is unaffected (that is not a Claude tool call).
#
# No-op (allows the push) when the gate does not apply: the command is not a real
# `git push`, the working directory is not inside an R package, or
# Rscript/devtools are unavailable.
#
# Wired up via a PreToolUse hook in this plugin's hooks/hooks.json.

INPUT=$(cat)

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
CWD=${CWD:-$PWD}

[ "$TOOL" = "Bash" ] || exit 0

# Only gate an actual `git push`. Match `git ... push` as a subcommand so other
# commands (or a message containing "push") do not trigger it. `git push`,
# `git -C path push`, and `git push --force` all match; `git push --help` and
# `--dry-run` are allowed through.
printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git([[:space:]]+-[^;&|]*)?[[:space:]]+push([[:space:]]|$)' || exit 0
# A push that would not actually publish anything is not worth gating.
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

# Must actually be an R package (DESCRIPTION with a Package: field).
grep -qE '^Package:[[:space:]]*[A-Za-z]' "$pkg_root/DESCRIPTION" 2>/dev/null || exit 0

command -v Rscript >/dev/null 2>&1 || exit 0
Rscript -e 'quit(status = if (requireNamespace("devtools", quietly = TRUE)) 0L else 1L)' >/dev/null 2>&1 || exit 0

echo "Running R CMD check before push (r-pkg-dev gate). This can take a few minutes..." >&2

# Run the check quietly and inspect the result object. devtools::check() returns
# an rcmdcheck object with $errors, $warnings, $notes (character vectors). Block
# only when there are errors; report warnings/notes but let the push proceed.
OUTPUT=$(cd "$pkg_root" && NOT_CRAN=true Rscript -e '
  res <- devtools::check(quiet = TRUE, error_on = "never")
  ne <- length(res$errors); nw <- length(res$warnings); nn <- length(res$notes)
  cat(sprintf("R CMD check: %d error(s), %d warning(s), %d note(s).\n", ne, nw, nn))
  if (ne > 0) {
    cat("\n--- ERRORS ---\n")
    cat(res$errors, sep = "\n")
    quit(status = 1L)
  }
' 2>&1)
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "Push blocked: R CMD check reported errors."
    echo
    printf '%s\n' "$OUTPUT"
    echo
    echo "Fix the R CMD check errors (run devtools::check() or the r-btw"
    echo "btw_tool_pkg_check tool to reproduce), then push again."
  } >&2
  exit 2
fi

# Surface warnings/notes without blocking, so they are visible but not a gate.
[ -n "$OUTPUT" ] && printf '%s\n' "$OUTPUT" >&2

exit 0
