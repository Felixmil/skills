#!/bin/bash
# r-btw setup doctor: check the two prerequisites the r-btw MCP server needs and
# print the exact fix for anything missing. Run on demand; nothing here runs
# automatically and nothing is modified.
#
#   bash scripts/r-btw-doctor.sh
#
# The r-btw MCP server (declared in this plugin's .mcp.json as
# `Rscript -e "btw::btw_mcp_server()"`) needs only:
#   1. Rscript on PATH.
#   2. The `btw` R package installed.
# The tools work with or without an interactive R session attached, so no
# ~/.Rprofile change is required. Attaching a session is optional (it lets the
# tools reuse warm in-memory state); this script reports whether one is likely
# to attach but never fails on its absence.

ok=0
fail=0
pass() {
  printf '  [ok]   %s\n' "$1"
  ok=$((ok + 1))
}
bad() {
  printf '  [FAIL] %s\n' "$1"
  fail=$((fail + 1))
}
info() {
  printf '  [info] %s\n' "$1"
}

echo "r-btw setup doctor"
echo

# 1. Rscript on PATH.
if command -v Rscript >/dev/null 2>&1; then
  pass "Rscript found: $(command -v Rscript)"
else
  bad "Rscript not found on PATH."
  echo "         Install R (https://www.r-project.org) so that Rscript is on PATH."
fi

# 2. btw package installed (only meaningful if Rscript exists).
if command -v Rscript >/dev/null 2>&1; then
  ver=$(Rscript -e 'cat(tryCatch(as.character(packageVersion("btw")), error = function(e) ""))' 2>/dev/null)
  if [ -n "$ver" ]; then
    pass "btw package installed (version $ver)."
  else
    bad "btw package is not installed."
    echo "         Install it from CRAN:"
    echo "           Rscript -e 'install.packages(\"btw\")'"
    echo "         or the development version:"
    echo "           Rscript -e 'pak::pak(\"posit-dev/btw\")'"
  fi
fi

# 3. Optional: an attached interactive session. Reported, never required.
RPROFILE="${R_PROFILE_USER:-$HOME/.Rprofile}"
if [ -f "$RPROFILE" ] && grep -qE 'btw_mcp_session[[:space:]]*\(' "$RPROFILE" 2>/dev/null; then
  info "$RPROFILE calls btw::btw_mcp_session(). Note this attaches only in"
  echo "         sessions that source ~/.Rprofile; projects with their own"
  echo "         .Rprofile (every renv project) skip it. Attaching is optional."
else
  info "No btw::btw_mcp_session() call in $RPROFILE. That is fine: the tools"
  echo "         run in a project-local process when no session is attached."
  echo "         To reuse a live session's warm state, run btw::btw_mcp_session()"
  echo "         in a console started inside the project when you want it."
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "Required checks passed ($ok/$((ok + fail))). The r-btw MCP tools are ready;"
  echo "attaching an interactive session is optional. See the r-conventions skill's"
  echo "references/btw-mcp.md for when and how to attach one."
  exit 0
else
  echo "$fail required check(s) failed, $ok passed. Fix the items above."
  echo "Note: the r-pkg-dev skill and guardrail hooks work regardless; only the"
  echo "r-btw MCP tools depend on these prerequisites."
  exit 1
fi
