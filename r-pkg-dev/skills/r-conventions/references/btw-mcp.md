# Using the r-btw MCP tools correctly

This plugin declares an `r-btw` MCP server (`.mcp.json`: `Rscript -e "btw::btw_mcp_server()"`). Claude Code launches that server itself, as a subprocess, with the current project as its working directory. The `mcp__r-btw__*` tools it exposes are the fast path for R package work (`btw_tool_pkg_load_all`, `btw_tool_pkg_test`, `btw_tool_pkg_document`, `btw_tool_pkg_check`, `btw_tool_files_*`, `btw_tool_env_*`). This file explains where those tools actually run, so you can be sure a call reflects the project you are working in and not some other R session.

## The one rule

Try the tool first. It works whether or not any R session has registered, so there is no setup step to perform before using it. The only situation that needs attention is when a tool call returns results that do not match the current project (wrong package versions, unexpected files, objects you never created). That symptom means a mismatched R session is registered; the "Fixing a mismatch" section below is the remedy.

## Where a tool call runs (the three regimes)

An `mcp__r-btw__*` tool call is executed in one of two R processes, depending on whether any R session has registered itself with the server by calling `btw::btw_mcp_session()` (a thin wrapper over `mcptools::mcp_session()`).

1. No session registered. The server runs the tool in its own process, the one Claude spawned from `.mcp.json`. Because that process starts with the project as its working directory, it sources the project's `.Rprofile` on startup, so for an renv project it activates renv and comes up with the project's private library on `.libPaths()`. Tool calls therefore see the correct project library and the correct project files. The catch is that this process is fresh and stateless: its global environment is empty, so it cannot see in-memory objects, and it has not run `devtools::load_all()`. It is right for files, docs, package-dev, and installed-package tools, not for inspecting live objects.

2. One session registered, matching the project. The server forwards every tool call to that session's process. You get live in-memory state (objects, a prior `load_all()`) at that session's library. This is the fast, stateful path, and it is correct as long as the registered session was started inside the project (so its `.libPaths()` is the project's).

3. A session registered from a different project (the hazard). The server still forwards to it. Tool calls then run with that other project's working directory, files, objects, and library, with no error and no warning. Working in project A while a session from project B is registered, you silently read project B's world. This is the only real failure mode, and it is why "try the tool, then sanity-check the result" matters.

The server routes to the first-registered session by default (registration order, not project match), so regime 3 is easy to fall into whenever you keep more than one interactive R session attached.

## Why `~/.Rprofile` is not the setup step

It is tempting to auto-register every session by putting `btw::btw_mcp_session()` in `~/.Rprofile`. Do not rely on this, for two reasons.

R sources only one profile per session, by precedence: a project `.Rprofile` in the working directory wins, and when it is present `~/.Rprofile` is not sourced at all. renv projects always ship a project `.Rprofile` (it sources `renv/activate.R`), so in exactly the projects where the library matters most, a `~/.Rprofile` registration never runs. It fires only in non-renv sessions, which are the ones with the least need for it and the wrong library for renv work.

Even setting precedence aside, auto-registering every session makes regime 3 the norm: several sessions attach, and the server picks whichever registered first rather than the one matching the current project. Registration is better done deliberately, per session, in the project you actually want to inspect.

## Fixing a mismatch

When a tool result does not match the current project, or you specifically need live in-memory state:

1. Call `list_r_sessions`. Each entry is labelled with the session's working-directory basename, for example `1: myproj (...)`. Note that the label is only the last path segment, so two projects with the same folder name, or a session started in a subdirectory, can be ambiguous; treat the match as a strong hint, not a certainty.
2. If exactly one session matches the current project, call `select_r_session` with its number. The selection persists for subsequent calls. Re-run the tool; it now runs in that session.
3. If more than one session matches, or the labels are ambiguous, report the `list_r_sessions` output to the user and let them choose which to select rather than guessing.
4. If none match and you need only stateless tools (files, docs, package checks), the simplest correct fix is to register the project's own session (next step) and select it. The fully-stateless no-session regime is only in effect when nothing is registered at all, so once any session exists you route through a session; make it the right one.
5. If none match and you need live in-memory state, register the correct session. Two ways:
   - Temporary (per session): start R inside the project (so renv activates) and run `btw::btw_mcp_session()` in that console. It registers, and because it is started in-project its library is correct. Repeat each time you start that session.
   - Permanent-ish (renv projects): append the registration to the project's own `.Rprofile`, after the `source("renv/activate.R")` line, so renv is active first:
     ```r
     if (interactive() && requireNamespace("btw", quietly = TRUE)) {
       try(btw::btw_mcp_session(), silent = TRUE)
     }
     ```
     Two caveats: renv generates and can regenerate that `.Rprofile` (on `init`, `snapshot`, `restore`), so the line may be overwritten and need re-adding; and the file is typically committed, so this registers the session for everyone on the project, not just you.

## When the tools are unavailable

If the `mcp__r-btw__*` tools are absent (no `btw`, no `Rscript`, or the server did not start), fall back to running `Rscript` / `R CMD` from the shell in the project directory. Started in-project, a plain `Rscript` invocation sources the project `.Rprofile` and so gets the same renv-correct library the no-session server process does, just without any warm state. Point the user to `scripts/r-btw-doctor.sh` to diagnose the r-btw setup.
