#!/bin/bash
# r-btw setup doctor: check the two prerequisites the r-btw MCP server needs and
# print the exact fix for anything missing. Run on demand; nothing here runs
# automatically and nothing is modified.
#
#   bash scripts/r-btw-doctor.sh
#
# The r-btw MCP server (declared in this plugin's .mcp.json as
# `Rscript -e "btw::btw_mcp_server()"`) needs:
#   1. Rscript on PATH.
#   2. The `btw` R package installed.
#   3. An interactive-session call to btw::btw_mcp_session() in the user's
#      ~/.Rprofile, so the running R session attaches to the MCP server. Without
#      it the server starts but has no session to expose.

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

# 3. ~/.Rprofile calls btw::btw_mcp_session().
RPROFILE="${R_PROFILE_USER:-$HOME/.Rprofile}"
if [ -f "$RPROFILE" ] && grep -qE 'btw_mcp_session[[:space:]]*\(' "$RPROFILE" 2>/dev/null; then
  pass "$RPROFILE calls btw::btw_mcp_session()."
else
  bad "$RPROFILE does not call btw::btw_mcp_session()."
  echo "         Add this to $RPROFILE so interactive R sessions attach to the"
  echo "         MCP server (it fails gracefully if btw is absent):"
  echo
  echo "           if (interactive() && requireNamespace(\"btw\", quietly = TRUE)) {"
  echo "             try(btw::btw_mcp_session(), silent = TRUE)"
  echo "           }"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "All checks passed ($ok/$((ok + fail))). Restart your R session so the"
  echo ".Rprofile change takes effect, then the r-btw MCP tools will attach."
  exit 0
else
  echo "$fail check(s) failed, $ok passed. Fix the items above, then restart R."
  echo "Note: the r-pkg-dev skill and guardrail hooks work regardless; only the"
  echo "r-btw MCP tools depend on these prerequisites."
  exit 1
fi
