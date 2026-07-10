# r-pkg-dev

A Claude Code plugin that packages R package development conventions, guardrail hooks, and the `r-btw` MCP server so they can be enabled per project and kept up to date automatically.

## What it ships

- **`r-conventions` skill.** The full set of R package conventions (R code, dependencies, `DESCRIPTION`, data, testing, documentation, lifecycle, license) plus agent-workflow guidance for building packages efficiently (prefer the r-btw tools, `load_all()` over reinstall, the tight test loop). It triggers automatically when working in an R package (editing `.R`/`.Rmd`/`.qmd`, `DESCRIPTION`, `NAMESPACE`, `NEWS.md`, or `_pkgdown.yml`, or running R tests).
- **Guardrail hooks**, all no-ops outside an R package so they are safe everywhere:
  - `air-format` (on edit): formats `.R` files with [Air](https://posit-dev.github.io/air/) after each edit.
  - `check-r-code` (on edit): blocks common anti-patterns in files below `R/` (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`) and warns on bare `T`/`F`.
  - `check-roxygen-docs` (on edit): after editing an `.R` file with roxygen comments, blocks if `man/` is out of date (via the fast `roxygen2::needs_roxygenize()`), or if a new roxygen file has no `.Rd` yet, so `devtools::document()` is run.
  - `check-pkgdown-index` (on edit / document): after `devtools::document()` or a `_pkgdown.yml` edit, blocks if the pkgdown reference index is out of sync with the package's exports.
  - `check-tests-before-commit` (on `git commit`): runs the full `devtools::test()` suite (with `NOT_CRAN=true`) before a commit and blocks it if any test fails, so red code never enters history. Runs even with `git commit --no-verify`. The tight edit/test loop during development stays targeted; the full suite is paid only at the commit boundary.
  - `check-rcmd-before-push` (on `git push`): runs `R CMD check` (via `devtools::check()`) before a push and blocks it if the check reports any error, so a broken package does not leave the machine. Warnings and notes are reported but do not block. The check runs only at the push boundary, which is infrequent.
- **`r-btw` MCP server.** Declared in `.mcp.json` so the running R session tools are available in any project where the plugin is enabled.

## Requirements

The **skill and guardrail hooks work with no external setup**; each hook degrades to a silent no-op when a tool or package it needs is missing, so a partial environment never errors. To get the full value, install the following.

### System tools

- [Air](https://posit-dev.github.io/air/) on `PATH` (or in `~/.local/bin` or `/usr/local/bin`) for the format hook.
- `Rscript` on `PATH` for the R-based hooks and the MCP server.
- `jq` for the hook payload parsing.

### R packages

```r
install.packages(c("devtools", "btw"))
```

- `devtools` provides the development workflow the conventions rely on and, as dependencies, pulls in every other package the plugin uses: `roxygen2` (the roxygen-docs hook), `pkgdown` (the pkgdown-index hook), and `testthat`, `usethis`, `withr`, `rlang`, and `lifecycle` (referenced by the testing, dependency, and lifecycle conventions).
- `btw` powers the `r-btw` MCP server (development version: `pak::pak("posit-dev/btw")`).

The **`r-btw` MCP server needs no setup beyond installing `btw`** (see next section). If `btw` is absent the server simply fails to connect and the rest of the plugin is unaffected.

## r-btw MCP setup

The `r-btw` MCP server exposes tools that read an R session (files, git, package dev, session info). It is declared in `.mcp.json` as `Rscript -e "btw::btw_mcp_server()"`, and Claude Code launches it with the current project as its working directory. Once `btw` is installed there is nothing else to configure: the tools work whether or not an interactive R session is attached. With no session attached, a tool call runs in the server's own project-local process (correct project files and, for an renv project, the project library, but no live in-memory objects). Attach an interactive session only when you want the tools to reuse its warm state.

To attach an interactive session, run `btw::btw_mcp_session()` in a console started inside the project. Prefer running it deliberately over auto-registering from `~/.Rprofile`: R sources a project `.Rprofile` instead of `~/.Rprofile` when one is present (as every renv project ships), so a `~/.Rprofile` call never runs in renv projects, and auto-registering many sessions makes the server route to whichever registered first rather than the one matching your project. The `r-conventions` skill's `references/btw-mcp.md` documents how to pick the right session (`list_r_sessions` / `select_r_session`) and the renv implications in full.

To check the r-btw prerequisites (Rscript and the `btw` package), run the bundled doctor script (`r-pkg-dev/scripts/r-btw-doctor.sh` in this plugin):

```
bash scripts/r-btw-doctor.sh
```

It reports what is present and prints the exact fix for anything missing. The skill and hooks are unaffected by these checks.

## Install

Install from the `skills` marketplace, then enable the plugin where you want it.

```
/plugin marketplace add Felixmil/skills
/plugin install r-pkg-dev@skills
```

To keep it updating from `main` automatically, ensure the marketplace has `autoUpdate: true` in your Claude settings (this is set when you add it through the marketplace, matching the other GitHub-backed marketplaces already in use).

Enable it per project (in that project's `.claude/settings.json`) or globally, whichever scope you prefer.

## Conventions source

The R code, dependency, data, documentation, lifecycle, and license rules draw on *R Packages* (2nd ed) by Hadley Wickham and Jennifer Bryan (https://r-pkgs.org) and the checks performed by `R CMD check`.
