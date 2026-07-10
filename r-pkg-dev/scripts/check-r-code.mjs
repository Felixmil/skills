#!/usr/bin/env node
// Guardrail: catch R-package anti-patterns in files under R/ right after Claude
// edits or writes them, based on rules from "R Packages" (2nd ed, Wickham &
// Bryan) and the checks R CMD check performs.
//
// Only inspects files under an R/ directory of a package (a DESCRIPTION exists at
// the package root); silent no-op everywhere else, so it is safe in any project.
//
// Reads the PostToolUse payload on stdin.
//
// BLOCKING checks (exit 2, must be fixed before moving on):
//   - library(), require(), source() below R/           (declare deps in
//     DESCRIPTION; use devtools::load_all(), not source())
//   - foo:::bar reaching into ANOTHER package's namespace (fails R CMD check;
//     same-package Pkg:::internal is allowed)
//   - setwd() below R/, and the forbidden .First.lib / .Last.lib hooks, and
//     writing to the user's home (~) from package code (leave the world as you
//     found it; use tools::R_user_dir() for persistent data)
//
// WARNING checks (printed, but exit 0 so they never block an edit):
//   - bare T / F used as logicals (use TRUE / FALSE). Warned, not blocked,
//     because T and F are also legitimate as variable or column names.
//
// Wired up via a PostToolUse hook in this plugin's hooks/hooks.json.

import {
  readPayload,
  editedFilePath,
  existsSync,
  readFileSync,
  join,
} from "./lib/hook.mjs";

const payload = readPayload();
const tool = payload?.tool_name || "";
const file = editedFilePath(payload);

if (!["Edit", "Write", "MultiEdit"].includes(tool)) process.exit(0);
if (!file) process.exit(0);
// Only .R / .r source files.
if (!/\.(R|r)$/.test(file)) process.exit(0);
if (!existsSync(file)) process.exit(0);
// The file must live under an R/ directory (…/R/foo.R or …/R/sub/foo.R).
if (!/[\\/]R[\\/]/.test(file)) process.exit(0);

// Find the package root: the segment before the R/ directory must hold
// DESCRIPTION. No DESCRIPTION -> not a package -> no-op.
const pkgRoot = file.replace(/[\\/]R[\\/].*$/, "");
if (!existsSync(join(pkgRoot, "DESCRIPTION"))) process.exit(0);

const rawText = safeRead(file);
const rawLines = rawText.split(/\r?\n/);

// Package name, to distinguish same-package ::: (allowed) from cross-package
// ::: (blocked).
const descText = safeRead(join(pkgRoot, "DESCRIPTION"));
const pkgNameMatch = descText.match(/^Package:[ \t]*([^\r\n \t]+)/m);
const pkgName = pkgNameMatch ? pkgNameMatch[1] : "";

// Strip comments and character/string literals crudely so matches below are on
// code, not on prose in comments or inside strings. This is a heuristic, not a
// parser: it removes everything from the first unescaped # to end of line, and
// blanks out "…" and '…' contents. Applied line-by-line so line numbers align.
const codeLines = rawLines.map((line) =>
  line
    .replace(/#.*$/, "")
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''"),
);

// grep -nE over an array of lines: return "<lineNumber>:<originalLine>" for each
// line matching `re`, using 1-based numbering, matching against `lines[i]`.
function grepN(lines, re, { against = lines } = {}) {
  const hits = [];
  for (let i = 0; i < against.length; i++) {
    if (re.test(against[i])) hits.push(`${i + 1}:${lines[i]}`);
  }
  return hits;
}

const blocking = [];
function addBlock(msg, hits) {
  blocking.push(hits ? `${msg}\n${hits.join("\n")}` : msg);
}

// 1. library() / require() / source() below R/.
{
  const hits = grepN(
    codeLines,
    /(^|[^a-zA-Z0-9._])(library|require|source)[ \t]*\(/,
  );
  if (hits.length)
    addBlock(
      "library()/require()/source() are not allowed below R/. Declare dependencies in DESCRIPTION (Imports/Suggests) and call functions with pkg::fun(); use devtools::load_all(), never source(). Offending lines:",
      hits,
    );
}

// 2. Cross-package ::: (allow same-package Pkg:::internal).
{
  const tri = grepN(codeLines, /[A-Za-z][A-Za-z0-9._]*:::/);
  if (tri.length && pkgName) {
    const sameRe = new RegExp(`(^|[^A-Za-z0-9._])${escapeRe(pkgName)}:::`);
    // Re-derive the original line from each "N:content" entry to test it.
    const cross = tri.filter((entry) => {
      const content = entry.slice(entry.indexOf(":") + 1);
      return !sameRe.test(content);
    });
    if (cross.length)
      addBlock(
        "Do not use ::: to reach into another package's internal namespace (fails R CMD check). Use :: for exported functions. Offending lines:",
        cross,
      );
  } else if (tri.length && !pkgName) {
    // No package name resolved: cannot tell same- from cross-package, so flag
    // all ::: uses (the shell version's grep -vE with an empty name did the same).
    addBlock(
      "Do not use ::: to reach into another package's internal namespace (fails R CMD check). Use :: for exported functions. Offending lines:",
      tri,
    );
  }
}

// 3a. setwd() below R/.
{
  const hits = grepN(codeLines, /(^|[^a-zA-Z0-9._])setwd[ \t]*\(/);
  if (hits.length)
    addBlock(
      "setwd() is not allowed below R/ (leave the working directory as you found it). Offending lines:",
      hits,
    );
}

// 3b. Forbidden .First.lib / .Last.lib hooks.
{
  const hits = grepN(codeLines, /\.(First|Last)\.lib[ \t]*(<-|=)/);
  if (hits.length)
    addBlock(
      ".First.lib/.Last.lib are forbidden. Use .onLoad/.onAttach/.onUnload in R/zzz.R instead. Offending lines:",
      hits,
    );
}

// 3c. Writing to the user's home directory from package code. Checked against
// the raw file (not the comment/string-stripped copy) because the target path is
// a string literal, so "~/…" only appears inside quotes. Drop comment lines
// first so a "~/" mentioned in a comment does not trip it.
{
  const hits = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (/^[ \t]*#/.test(line)) continue; // comment line
    if (/(write|save|saveRDS|writeLines|cat|file|con)[ \t]*\([^)]*"~\//.test(line))
      hits.push(`${i + 1}:${line}`);
  }
  if (hits.length)
    addBlock(
      "Do not write to the user's home directory from package code. Use tools::R_user_dir() for persistent data, or tempdir() for scratch. Offending lines:",
      hits,
    );
}

// WARNING: bare T / F used as logicals (non-blocking).
const tf = grepN(codeLines, /(^|[^a-zA-Z0-9._$@])[TF]([^a-zA-Z0-9._]|$)/).filter(
  (entry) => {
    const content = entry.slice(entry.indexOf(":") + 1);
    // Exclude assignments to a variable/column literally named T or F.
    return !/[TF][ \t]*(<-|=[^=])/.test(content);
  },
);

const relFile = file.startsWith(`${pkgRoot}/`)
  ? file.slice(pkgRoot.length + 1)
  : file.startsWith(`${pkgRoot}\\`)
    ? file.slice(pkgRoot.length + 1)
    : file;

if (blocking.length) {
  const parts = [`R package guardrail (${relFile}):`, "", blocking.join("\n")];
  if (tf.length) {
    parts.push(
      "",
      "Also (warning) bare T/F used where TRUE/FALSE is expected; verify these are not logicals:",
      tf.join("\n"),
      "",
    );
  }
  process.stderr.write(`${parts.join("\n")}\n`);
  process.exit(2);
}

if (tf.length) {
  process.stderr.write(
    [
      `R package guardrail warning (${relFile}): bare T/F may be used as logicals; use TRUE/FALSE (T/F can be silently rebound). Verify these are not logicals:`,
      tf.join("\n"),
    ].join("\n") + "\n",
  );
  // Warning only: do not block.
}

process.exit(0);

function safeRead(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
