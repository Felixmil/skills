#!/usr/bin/env node
// Guardrail: keep man/ in sync with roxygen comments. After Claude edits or
// creates an .R file under R/ that carries roxygen (#' ) comments, block (exit 2)
// when the generated documentation is stale, so devtools::document() is run
// before moving on.
//
// Speed: the primary check is roxygen2::needs_roxygenize(), a fast built-in that
// compares each man/*.Rd against the mtime of the R file recorded in its
// provenance header ("% Please edit documentation in R/foo.R"). It never
// evaluates the code in R/, so it does not scale with package size (~0.3s, R
// startup dominated), unlike a full devtools::document().
//
// needs_roxygenize() has one blind spot this hook closes: it only iterates
// EXISTING man/*.Rd files, so a brand-new R file with fresh roxygen and no .Rd
// yet is not detected. When the edited file has roxygen but no .Rd backref points
// at it, this hook flags that too.
//
// NAMESPACE staleness (from adding/removing @export, @import, etc.) is not
// checked here: a cheap check would be too noisy as a hard block. The
// r-conventions skill covers it by telling the agent to document() after changing
// export/import tags.
//
// No-op unless the edited file is an .R file under R/ in a package (DESCRIPTION at
// the package root) and Rscript is available, so this is silent everywhere else.
//
// Wired up via a PostToolUse hook in this plugin's hooks/hooks.json.

import { readdirSync } from "node:fs";
import {
  readPayload,
  editedFilePath,
  onPath,
  run,
  block,
  existsSync,
  readFileSync,
  join,
  basename,
} from "./lib/hook.mjs";

const payload = readPayload();
const tool = payload?.tool_name || "";
const file = editedFilePath(payload);

if (!["Edit", "Write", "MultiEdit"].includes(tool)) process.exit(0);
if (!file) process.exit(0);
if (!/\.(R|r)$/.test(file)) process.exit(0);
// The file must live under an R/ directory (…/R/foo.R or …/R/sub/foo.R).
if (!/[\\/]R[\\/]/.test(file)) process.exit(0);
if (!existsSync(file)) process.exit(0);

// Package root: the segment before the R/ directory, must hold DESCRIPTION.
const pkgRoot = file.replace(/[\\/]R[\\/].*$/, "");
if (!existsSync(join(pkgRoot, "DESCRIPTION"))) process.exit(0);

if (!onPath("Rscript")) process.exit(0);

// The hook is only relevant when the edited file carries roxygen comments.
const source = safeRead(file);
if (!/^\s*#'/m.test(source)) process.exit(0);

// --- Gap check: edited file has roxygen but no man/*.Rd references it yet. ---
// A new .R file (or one whose docs were never generated) will not be caught by
// needs_roxygenize(). Look for any .Rd whose provenance header lists this file.
const baseR = basename(file);
const relR = `R/${baseR}`;
const manDir = join(pkgRoot, "man");
let hasBackref = false;
if (existsSync(manDir)) {
  // The provenance line is "% Please edit documentation in R/a.R, R/b.R"; match
  // the file name as a token so R/foo.R does not match R/foobar.R.
  const escaped = baseR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const backref = new RegExp(
    `Please edit documentation in .*(^|[ ,/])${escaped}([ ,]|$)`,
    "m",
  );
  for (const entry of readdirSync(manDir)) {
    if (!/\.Rd$/i.test(entry)) continue;
    if (backref.test(safeRead(join(manDir, entry)))) {
      hasBackref = true;
      break;
    }
  }
}

if (!hasBackref) {
  block(
    [
      `roxygen docs may be missing for ${relR}:`,
      "",
      "This file has roxygen comments but no man/*.Rd page references it, so its",
      "documentation has not been generated yet. Run devtools::document() (prefer",
      "the r-btw tool btw_tool_pkg_document if available) to create the .Rd and",
      "update NAMESPACE.",
    ].join("\n"),
  );
}

// --- Primary check: fast roxygen2 staleness predicate. ---
const { out, status } = run(
  "Rscript",
  [
    "--vanilla",
    "-e",
    'if (isTRUE(roxygen2::needs_roxygenize("."))) quit(status = 1L)',
  ],
  { cwd: pkgRoot },
);

if (status !== 0) {
  block(
    [
      "roxygen documentation is out of date (roxygen2::needs_roxygenize() reported stale man pages):",
      "",
      out.trim() ? `${out.trim()}\n` : "",
      "Run devtools::document() (prefer the r-btw tool btw_tool_pkg_document if",
      "available) to regenerate man/ and NAMESPACE, then continue.",
    ]
      .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
      .join("\n"),
  );
}

process.exit(0);

function safeRead(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
