#!/bin/bash
# Auto-format an .R file with Air (https://posit-dev.github.io/air/) right after
# Claude edits or writes it, so no manual `air format` is needed.
#
# Reads the PostToolUse hook payload on stdin, extracts the edited file path, and
# formats it in place. Silent no-op when Air is not installed or the path is not
# an .R file, so this is safe in any project.
#
# Air is looked up on PATH first, then in the two common install locations, so
# this works across machines without a hardcoded path.

INPUT=$(cat)

FILE=$(printf '%s' "$INPUT" | jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)
[ -n "$FILE" ] || exit 0

# Only format R source files. Air does not support .qmd/.Rmd.
case "$FILE" in
  *.R | *.r) ;;
  *) exit 0 ;;
esac

[ -f "$FILE" ] || exit 0

AIR=""
if command -v air >/dev/null 2>&1; then
  AIR=air
elif [ -x "$HOME/.local/bin/air" ]; then
  AIR="$HOME/.local/bin/air"
elif [ -x "/usr/local/bin/air" ]; then
  AIR="/usr/local/bin/air"
fi
[ -n "$AIR" ] || exit 0

"$AIR" format "$FILE" >/dev/null 2>&1 || true
exit 0
