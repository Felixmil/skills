#!/bin/bash
# Guardrail: keep man/ in sync with roxygen comments. After Claude edits or
# creates an .R file under R/ that carries roxygen (#' ) comments, block (exit 2)
# when the generated documentation is stale, so devtools::document() is run
# before moving on.
#
# Speed: the primary check is roxygen2::needs_roxygenize(), a fast built-in that
# compares each man/*.Rd against the mtime of the R file recorded in its
# provenance header ("% Please edit documentation in R/foo.R"). It never
# evaluates the code in R/, so it does not scale with package size (~0.3s, R
# startup dominated), unlike a full devtools::document().
#
# needs_roxygenize() has one blind spot this hook closes: it only iterates
# EXISTING man/*.Rd files, so a brand-new R file with fresh roxygen and no .Rd
# yet is not detected. When the edited file has roxygen but no .Rd backref points
# at it, this hook flags that too.
#
# NAMESPACE staleness (from adding/removing @export, @import, etc.) is not
# checked here: a cheap check would be too noisy as a hard block. The
# r-conventions skill covers it by telling the agent to document() after changing
# export/import tags.
#
# No-op unless the edited file is an .R file under R/ in a package (DESCRIPTION at
# the package root) and Rscript is available, so this is silent everywhere else.
#
# Wired up via a PostToolUse hook in this plugin's hooks/hooks.json.

INPUT=$(cat)

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)

case "$TOOL" in
  Edit | Write | MultiEdit) ;;
  *) exit 0 ;;
esac

[ -n "$FILE" ] || exit 0

case "$FILE" in
  *.R | *.r) ;;
  *) exit 0 ;;
esac
case "$FILE" in
  */R/*) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

# Package root: the parent of the R/ directory, must hold DESCRIPTION.
pkg_root=${FILE%/R/*}
[ -f "$pkg_root/DESCRIPTION" ] || exit 0

command -v Rscript >/dev/null 2>&1 || exit 0

# The hook is only relevant when the edited file carries roxygen comments.
grep -qE "^[[:space:]]*#'" "$FILE" 2>/dev/null || exit 0

# --- Gap check: edited file has roxygen but no man/*.Rd references it yet. ---
# A new .R file (or one whose docs were never generated) will not be caught by
# needs_roxygenize(). Look for any .Rd whose provenance header lists this file.
base_r=$(basename "$FILE")
rel_r="R/$base_r"
has_backref=0
if [ -d "$pkg_root/man" ]; then
  # The provenance line is "% Please edit documentation in R/a.R, R/b.R"; match
  # the file name as a token so R/foo.R does not match R/foobar.R.
  if grep -rElq "Please edit documentation in .*(^|[ ,/])${base_r}([ ,]|$)" "$pkg_root/man" 2>/dev/null; then
    has_backref=1
  fi
fi

if [ "$has_backref" -eq 0 ]; then
  {
    echo "roxygen docs may be missing for ${rel_r}:"
    echo
    echo "This file has roxygen comments but no man/*.Rd page references it, so its"
    echo "documentation has not been generated yet. Run devtools::document() (prefer"
    echo "the r-btw tool btw_tool_pkg_document if available) to create the .Rd and"
    echo "update NAMESPACE."
  } >&2
  exit 2
fi

# --- Primary check: fast roxygen2 staleness predicate. ---
OUTPUT=$(cd "$pkg_root" && Rscript --vanilla -e 'if (isTRUE(roxygen2::needs_roxygenize("."))) quit(status = 1L)' 2>&1)
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "roxygen documentation is out of date (roxygen2::needs_roxygenize() reported stale man pages):"
    echo
    [ -n "$OUTPUT" ] && printf '%s\n' "$OUTPUT" && echo
    echo "Run devtools::document() (prefer the r-btw tool btw_tool_pkg_document if"
    echo "available) to regenerate man/ and NAMESPACE, then continue."
  } >&2
  exit 2
fi

exit 0
