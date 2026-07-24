# r-dev

A Claude Code plugin that packages R package development conventions and guardrail hooks so they can be enabled per project and kept up to date automatically.

## What it ships

- **`r-pkg-dev` skill.** The full set of R conventions (R code style, dependencies, `DESCRIPTION`, data, testing, documentation, lifecycle, license) plus agent-workflow guidance for building packages efficiently (`load_all()` over reinstall, the tight test loop). It triggers on any R work, editing `.R`/`.Rmd`/`.qmd`, `DESCRIPTION`, `NAMESPACE`, `NEWS.md`, or `_pkgdown.yml`, or running R code or tests, in a package or a plain R project. The skill marks which sections are universal (code style, formatting, and the testthat idioms, which apply to any R code) and which are package-only (everything that assumes a `DESCRIPTION`); in a non-package project only the universal rules apply.
- **Guardrail hooks**, all no-ops outside an R package so they are safe everywhere:
  - `air-format` (on edit): formats `.R` files with [Air](https://posit-dev.github.io/air/) after each edit.
  - `check-r-code` (on edit): blocks common anti-patterns in files below `R/` (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`) and warns on bare `T`/`F`.
  - `check-roxygen-before-commit` (on `git commit`): when a commit touches roxygen sources under `R/`, blocks it if `man/` is out of date (via the fast `roxygen2::needs_roxygenize()`), or if a committed roxygen file has no `.Rd` yet, so `devtools::document()` is run before stale docs are recorded. Checked once at the commit boundary rather than on every edit, so the tight edit loop is never interrupted. Skips commits that touch no `.R` file under `R/`, a message-only `--amend`, or an empty commit.
  - `check-pkgdown-index` (on `git commit`): when a commit touches `_pkgdown.yml`, `NAMESPACE`, or any `R/*.R`, runs `pkgdown::check_pkgdown()` and blocks it if the reference index is out of sync with the package's exports (a new export missing from the index, or a dangling topic). Sits on the same commit boundary as the roxygen check, so the two documentation guardrails fire together. Skips commits that touch none of those files, a message-only `--amend`, or an empty commit; a no-op in packages without a `_pkgdown.yml`.

  The commit gates have a deliberate escape hatch: prefix the command with `R_PKG_GATE_SKIP=1` (e.g. `R_PKG_GATE_SKIP=1 git commit -m wip`) to bypass them for that one commit. The bypass is announced on stderr, so it is always a conscious, visible choice, not a silent skip.

  There is no test-suite or `R CMD check` gate: reaching a green `devtools::test()` before a commit and a clean `devtools::check()` before a push are conventions the `r-pkg-dev` skill states, run by hand, not enforced by a hook.

## Requirements

The **skill and guardrail hooks work with no external setup**; each hook degrades to a silent no-op when a tool or package it needs is missing, so a partial environment never errors. To get the full value, install the following.

The hooks are Node scripts (`.mjs`), so they run identically on macOS, Linux, and native Windows: Claude Code ships Node on every platform, so no POSIX shell, Git Bash, or `jq` is needed.

### System tools

- [Air](https://posit-dev.github.io/air/) on `PATH` (or, on Unix, in `~/.local/bin` or `/usr/local/bin`) for the format hook.
- `Rscript` on `PATH` for the R-based hooks.

### R packages

```r
install.packages("devtools")
```

- `devtools` provides the development workflow the conventions rely on and, as dependencies, pulls in every other package the plugin uses: `roxygen2` (the roxygen-docs hook), `pkgdown` (the pkgdown-index hook), and `testthat`, `usethis`, `withr`, `rlang`, and `lifecycle` (referenced by the testing, dependency, and lifecycle conventions).

## Install

Install from the `skills` marketplace, then enable the plugin where you want it.

```
/plugin marketplace add Felixmil/skills
/plugin install r-dev@skills
```

To keep it updating from `main` automatically, ensure the marketplace has `autoUpdate: true` in your Claude settings (this is set when you add it through the marketplace, matching the other GitHub-backed marketplaces already in use).

Enable it per project (in that project's `.claude/settings.json`) or globally, whichever scope you prefer.

## Conventions source

The R code, dependency, data, documentation, lifecycle, and license rules draw on *R Packages* (2nd ed) by Hadley Wickham and Jennifer Bryan (https://r-pkgs.org) and the checks performed by `R CMD check`.
