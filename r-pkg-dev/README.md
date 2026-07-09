# r-pkg-dev

A Claude Code plugin that packages R package development conventions, guardrail hooks, and the `r-btw` MCP server so they can be enabled per project and kept up to date automatically.

## What it ships

- **`r-conventions` skill.** The full set of R package conventions (R code, dependencies, `DESCRIPTION`, data, testing, documentation, lifecycle, license) plus agent-workflow guidance for building packages efficiently (prefer the r-btw tools, `load_all()` over reinstall, the tight test loop). It triggers automatically when working in an R package (editing `.R`/`.Rmd`/`.qmd`, `DESCRIPTION`, `NAMESPACE`, `NEWS.md`, or `_pkgdown.yml`, or running R tests).
- **Guardrail hooks** (`PostToolUse`), all no-ops outside an R package so they are safe everywhere:
  - `air-format`: formats `.R` files with [Air](https://posit-dev.github.io/air/) after each edit.
  - `check-r-code`: blocks common anti-patterns in files below `R/` (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`) and warns on bare `T`/`F`.
  - `check-roxygen-docs`: after editing an `.R` file with roxygen comments, blocks if `man/` is out of date (via the fast `roxygen2::needs_roxygenize()`), or if a new roxygen file has no `.Rd` yet, so `devtools::document()` is run.
  - `check-pkgdown-index`: after `devtools::document()` or a `_pkgdown.yml` edit, blocks if the pkgdown reference index is out of sync with the package's exports.
- **`r-btw` MCP server.** Declared in `.mcp.json` so the running R session tools are available in any project where the plugin is enabled.

## Requirements

The **skill and guardrail hooks work with no external setup**; each hook degrades to a silent no-op when its tool is missing, so a partial environment never errors. The individual pieces use:

- [Air](https://posit-dev.github.io/air/) on `PATH` (or in `~/.local/bin` or `/usr/local/bin`) for the format hook.
- `Rscript` on `PATH` for the pkgdown-index hook.
- `jq` for the hook payload parsing.

The **`r-btw` MCP server has additional prerequisites** that a plugin cannot set up for you (see next section). If they are unmet, the server simply fails to connect and the rest of the plugin is unaffected.

## r-btw MCP setup

The `r-btw` MCP server exposes tools that read your live R session (files, git, package dev, session info). It is declared in `.mcp.json` as `Rscript -e "btw::btw_mcp_server()"` and needs two things that live on your machine, not in the plugin:

1. **The `btw` R package installed:**
   ```r
   install.packages("btw")            # CRAN
   # or: pak::pak("posit-dev/btw")    # development version
   ```
2. **A session-attach call in your `~/.Rprofile`,** so an interactive R session attaches to the MCP server. Add:
   ```r
   if (interactive() && requireNamespace("btw", quietly = TRUE)) {
     try(btw::btw_mcp_session(), silent = TRUE)
   }
   ```
   This fails gracefully when `btw` is absent, so it is safe to keep in a shared `~/.Rprofile`. Restart your R session after adding it.

To check both prerequisites at once, run the bundled doctor script (`r-pkg-dev/scripts/r-btw-doctor.sh` in this plugin):

```
bash scripts/r-btw-doctor.sh
```

It reports what is present, prints the exact fix for anything missing, and exits non-zero if the MCP will not attach. The skill and hooks are unaffected by any of these checks.

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
