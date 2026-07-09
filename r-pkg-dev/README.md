# r-pkg-dev

A Claude Code plugin that packages R package development conventions, guardrail hooks, and the `r-btw` MCP server so they can be enabled per project and kept up to date automatically.

## What it ships

- **`r-conventions` skill.** The full set of R package conventions (R code, dependencies, `DESCRIPTION`, data, testing, documentation, lifecycle, license, and the reprex-in-PR rules). It triggers automatically when working in an R package (editing `.R`/`.Rmd`/`.qmd`, `DESCRIPTION`, `NAMESPACE`, `NEWS.md`, or `_pkgdown.yml`, or running R tests).
- **Guardrail hooks** (`PostToolUse`), all no-ops outside an R package so they are safe everywhere:
  - `air-format`: formats `.R` files with [Air](https://posit-dev.github.io/air/) after each edit.
  - `check-r-code`: blocks common anti-patterns in files below `R/` (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`) and warns on bare `T`/`F`.
  - `check-pkgdown-index`: after `devtools::document()` or a `_pkgdown.yml` edit, blocks if the pkgdown reference index is out of sync with the package's exports.
- **`r-btw` MCP server.** Declared in `.mcp.json` so the running R session tools are available in any project where the plugin is enabled.

## Requirements

- [Air](https://posit-dev.github.io/air/) on `PATH` (or in `~/.local/bin` or `/usr/local/bin`) for the format hook.
- `Rscript` on `PATH`, and the `btw` R package installed, for the MCP server and the pkgdown hook.
- `jq` for the hook payload parsing.

Each hook degrades to a silent no-op when its tool is missing, so a partial setup will not error.

## Install

The repo is its own marketplace. Add it once, then enable the plugin where you want it.

```
/plugin marketplace add Felixmil/r-pkg-dev
/plugin install r-pkg-dev@r-pkg-dev
```

To keep it updating from `main` automatically, ensure the marketplace has `autoUpdate: true` in your Claude settings (this is set when you add it through the marketplace, matching the other GitHub-backed marketplaces already in use).

Enable it per project (in that project's `.claude/settings.json`) or globally, whichever scope you prefer.

## Conventions source

The R code, dependency, data, documentation, lifecycle, and license rules draw on *R Packages* (2nd ed) by Hadley Wickham and Jennifer Bryan (https://r-pkgs.org) and the checks performed by `R CMD check`.
