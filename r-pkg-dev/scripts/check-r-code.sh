#!/bin/bash
# Guardrail: catch R-package anti-patterns in files under R/ right after Claude
# edits or writes them, based on rules from "R Packages" (2nd ed, Wickham &
# Bryan) and the checks R CMD check performs.
#
# Only inspects files under an R/ directory of a package (a DESCRIPTION exists at
# the package root); silent no-op everywhere else, so it is safe in any project.
#
# Reads the PostToolUse payload on stdin.
#
# BLOCKING checks (exit 2, must be fixed before moving on):
#   - library(), require(), source() below R/           (declare deps in
#     DESCRIPTION; use devtools::load_all(), not source())
#   - foo:::bar reaching into ANOTHER package's namespace (fails R CMD check;
#     same-package Pkg:::internal is allowed)
#   - setwd() below R/, and the forbidden .First.lib / .Last.lib hooks, and
#     writing to the user's home (~) from package code (leave the world as you
#     found it; use tools::R_user_dir() for persistent data)
#
# WARNING checks (printed, but exit 0 so they never block an edit):
#   - bare T / F used as logicals (use TRUE / FALSE). Warned, not blocked,
#     because T and F are also legitimate as variable or column names.
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

# Only .R / .r source files.
case "$FILE" in
  *.R | *.r) ;;
  *) exit 0 ;;
esac

[ -f "$FILE" ] || exit 0

# The file must live under an R/ directory (…/R/foo.R or …/R/sub/foo.R).
case "$FILE" in
  */R/*) ;;
  *) exit 0 ;;
esac

# Find the package root: walk up from the R/ directory to the parent that holds
# DESCRIPTION. No DESCRIPTION -> not a package -> no-op.
rdir=${FILE%/R/*}
pkg_root=$rdir
[ -f "$pkg_root/DESCRIPTION" ] || exit 0

# Package name, to distinguish same-package ::: (allowed) from cross-package
# ::: (blocked).
pkg_name=$(awk -F: '/^Package:/{gsub(/[ \t\r]/,"",$2); print $2; exit}' "$pkg_root/DESCRIPTION" 2>/dev/null)

# Strip comments and character/string literals crudely so matches below are on
# code, not on prose in comments or inside strings. This is a heuristic, not a
# parser: it removes everything from the first unescaped # to end of line, and
# blanks out "…" and '…' contents.
code=$(sed -e "s/#.*$//" -e "s/\"[^\"]*\"/\"\"/g" -e "s/'[^']*'/''/g" "$FILE")

blocking=""
add_block() { blocking="${blocking}$1"$'\n'; }

# 1. library() / require() / source() below R/.
hits=$(printf '%s\n' "$code" | grep -nE '(^|[^a-zA-Z0-9._])(library|require|source)[[:space:]]*\(' 2>/dev/null)
if [ -n "$hits" ]; then
  add_block "library()/require()/source() are not allowed below R/. Declare dependencies in DESCRIPTION (Imports/Suggests) and call functions with pkg::fun(); use devtools::load_all(), never source(). Offending lines:"$'\n'"$hits"
fi

# 2. Cross-package ::: (allow same-package Pkg:::internal).
tri=$(printf '%s\n' "$code" | grep -nE '[A-Za-z][A-Za-z0-9._]*:::' 2>/dev/null)
if [ -n "$tri" ]; then
  cross=$(printf '%s\n' "$tri" | grep -vE "(^|[^A-Za-z0-9._])${pkg_name}:::" 2>/dev/null)
  if [ -n "$cross" ]; then
    add_block "Do not use ::: to reach into another package's internal namespace (fails R CMD check). Use :: for exported functions. Offending lines:"$'\n'"$cross"
  fi
fi

# 3a. setwd() below R/.
sw=$(printf '%s\n' "$code" | grep -nE '(^|[^a-zA-Z0-9._])setwd[[:space:]]*\(' 2>/dev/null)
[ -n "$sw" ] && add_block "setwd() is not allowed below R/ (leave the working directory as you found it). Offending lines:"$'\n'"$sw"

# 3b. Forbidden .First.lib / .Last.lib hooks.
fl=$(printf '%s\n' "$code" | grep -nE '\.(First|Last)\.lib[[:space:]]*(<-|=)' 2>/dev/null)
[ -n "$fl" ] && add_block ".First.lib/.Last.lib are forbidden. Use .onLoad/.onAttach/.onUnload in R/zzz.R instead. Offending lines:"$'\n'"$fl"

# 3c. Writing to the user's home directory from package code. Checked against the
# raw file (not the comment/string-stripped copy) because the target path is a
# string literal, so "~/…" only appears inside quotes. Drop comment lines first
# so a "~/" mentioned in a comment does not trip it.
home=$(grep -nE '(write|save|saveRDS|writeLines|cat|file|con)[[:space:]]*\([^)]*"~/' "$FILE" 2>/dev/null | grep -vE '^[0-9]+:[[:space:]]*#')
[ -n "$home" ] && add_block "Do not write to the user's home directory from package code. Use tools::R_user_dir() for persistent data, or tempdir() for scratch. Offending lines:"$'\n'"$home"

# WARNING: bare T / F used as logicals (non-blocking).
tf=$(printf '%s\n' "$code" | grep -nE '(^|[^a-zA-Z0-9._$@])[TF]([^a-zA-Z0-9._]|$)' 2>/dev/null | grep -vE '[TF][[:space:]]*(<-|=[^=])' 2>/dev/null)

if [ -n "$blocking" ]; then
  {
    echo "R package guardrail (${FILE#$pkg_root/}):"
    echo
    printf '%s\n' "$blocking"
    [ -n "$tf" ] && { echo "Also (warning) bare T/F used where TRUE/FALSE is expected; verify these are not logicals:"; printf '%s\n' "$tf"; echo; }
  } >&2
  exit 2
fi

if [ -n "$tf" ]; then
  {
    echo "R package guardrail warning (${FILE#$pkg_root/}): bare T/F may be used as logicals; use TRUE/FALSE (T/F can be silently rebound). Verify these are not logicals:"
    printf '%s\n' "$tf"
  } >&2
  # Warning only: do not block.
fi

exit 0
