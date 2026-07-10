#!/usr/bin/env node
// Auto-format an .R file with Air (https://posit-dev.github.io/air/) right after
// Claude edits or writes it, so no manual `air format` is needed.
//
// Reads the PostToolUse hook payload on stdin, extracts the edited file path, and
// formats it in place. Silent no-op when Air is not installed or the path is not
// an .R file, so this is safe in any project.
//
// Air is looked up on PATH first, then in the common Unix install locations, so
// this works across machines without a hardcoded path. On Windows only the PATH
// lookup applies (the Unix fallbacks simply do not exist there).

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import {
  readPayload,
  editedFilePath,
  onPath,
  existsSync,
  join,
} from "./lib/hook.mjs";

const payload = readPayload();
const file = editedFilePath(payload);
if (!file) process.exit(0);

// Only format R source files. Air does not support .qmd/.Rmd.
if (!/\.(R|r)$/.test(file)) process.exit(0);
if (!existsSync(file)) process.exit(0);

// Resolve Air: PATH first, then the common Unix install locations.
let air = "";
if (onPath("air")) {
  air = "air";
} else {
  for (const candidate of [
    join(homedir(), ".local", "bin", "air"),
    "/usr/local/bin/air",
  ]) {
    if (existsSync(candidate)) {
      air = candidate;
      break;
    }
  }
}
if (!air) process.exit(0);

spawnSync(air, ["format", file], { stdio: "ignore" });
process.exit(0);
