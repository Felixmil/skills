#!/usr/bin/env node
// r-btw setup doctor: check the two prerequisites the r-btw MCP server needs and
// print the exact fix for anything missing. Run on demand; nothing here runs
// automatically and nothing is modified.
//
//   node scripts/r-btw-doctor.mjs
//
// The r-btw MCP server (declared in this plugin's .mcp.json as
// `Rscript -e "btw::btw_mcp_server()"`) needs only:
//   1. Rscript on PATH.
//   2. The `btw` R package installed.
// The tools work with or without an interactive R session attached, so no
// ~/.Rprofile change is required. Attaching a session is optional (it lets the
// tools reuse warm in-memory state); this script reports whether one is likely
// to attach but never fails on its absence.

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let ok = 0;
let fail = 0;
const pass = (m) => {
  process.stdout.write(`  [ok]   ${m}\n`);
  ok++;
};
const bad = (m) => {
  process.stdout.write(`  [FAIL] ${m}\n`);
  fail++;
};
const info = (m) => process.stdout.write(`  [info] ${m}\n`);
const cont = (m) => process.stdout.write(`         ${m}\n`);

process.stdout.write("r-btw setup doctor\n\n");

// Resolve Rscript via PATH, cross-platform (PATHEXT handled by the OS on
// Windows). Returns the path when found, else "".
function rscriptPath() {
  const res = spawnSync("Rscript", ["--version"], { encoding: "utf8" });
  if (res.error) return "";
  // Rscript is on PATH; report the resolved location where we can.
  const which = spawnSync(process.platform === "win32" ? "where" : "which", [
    "Rscript",
  ]);
  const loc = (which.stdout || "").toString().split(/\r?\n/)[0].trim();
  return loc || "Rscript";
}

// 1. Rscript on PATH.
const rscript = rscriptPath();
if (rscript) {
  pass(`Rscript found: ${rscript}`);
} else {
  bad("Rscript not found on PATH.");
  cont("Install R (https://www.r-project.org) so that Rscript is on PATH.");
}

// 2. btw package installed (only meaningful if Rscript exists).
if (rscript) {
  const res = spawnSync(
    "Rscript",
    [
      "-e",
      'cat(tryCatch(as.character(packageVersion("btw")), error = function(e) ""))',
    ],
    { encoding: "utf8" },
  );
  const ver = (res.stdout || "").trim();
  if (ver) {
    pass(`btw package installed (version ${ver}).`);
  } else {
    bad("btw package is not installed.");
    cont("Install it from CRAN:");
    cont(`  Rscript -e 'install.packages("btw")'`);
    cont("or the development version:");
    cont(`  Rscript -e 'pak::pak("posit-dev/btw")'`);
  }
}

// 3. Optional: an attached interactive session. Reported, never required.
const rprofile = process.env.R_PROFILE_USER || join(homedir(), ".Rprofile");
let sessionCall = false;
if (existsSync(rprofile)) {
  try {
    sessionCall = /btw_mcp_session[ \t]*\(/.test(readFileSync(rprofile, "utf8"));
  } catch {
    sessionCall = false;
  }
}
if (sessionCall) {
  info(`${rprofile} calls btw::btw_mcp_session(). Note this attaches only in`);
  cont("sessions that source that profile; projects with their own");
  cont(".Rprofile (every renv project) skip it. Attaching is optional.");
} else {
  info(`No btw::btw_mcp_session() call in ${rprofile}. That is fine: the tools`);
  cont("run in a project-local process when no session is attached.");
  cont("To reuse a live session's warm state, run btw::btw_mcp_session()");
  cont("in a console started inside the project when you want it.");
}

process.stdout.write("\n");
if (fail === 0) {
  process.stdout.write(
    `Required checks passed (${ok}/${ok + fail}). The r-btw MCP tools are ready;\n` +
      "attaching an interactive session is optional. See the r-conventions skill's\n" +
      "references/btw-mcp.md for when and how to attach one.\n",
  );
  process.exit(0);
} else {
  process.stdout.write(
    `${fail} required check(s) failed, ${ok} passed. Fix the items above.\n` +
      "Note: the r-pkg-dev skill and guardrail hooks work regardless; only the\n" +
      "r-btw MCP tools depend on these prerequisites.\n",
  );
  process.exit(1);
}
