# r-pkg-dev

A Claude Code plugin that packages R package development conventions and guardrail hooks so they can be enabled per project and kept up to date automatically.

## What it ships

- **`r-conventions` skill.** The full set of R conventions (R code style, dependencies, `DESCRIPTION`, data, testing, documentation, lifecycle, license) plus agent-workflow guidance for building packages efficiently (`load_all()` over reinstall, the tight test loop). It triggers on any R work, editing `.R`/`.Rmd`/`.qmd`, `DESCRIPTION`, `NAMESPACE`, `NEWS.md`, or `_pkgdown.yml`, or running R code or tests, in a package or a plain R project. The skill marks which sections are universal (code style, formatting, and the testthat idioms, which apply to any R code) and which are package-only (everything that assumes a `DESCRIPTION`); in a non-package project only the universal rules apply.
- **Guardrail hooks**, all no-ops outside an R package so they are safe everywhere:
  - `air-format` (on edit): formats `.R` files with [Air](https://posit-dev.github.io/air/) after each edit.
  - `check-r-code` (on edit): blocks common anti-patterns in files below `R/` (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`) and warns on bare `T`/`F`.
  - `check-roxygen-docs` (on edit): after editing an `.R` file with roxygen comments, blocks if `man/` is out of date (via the fast `roxygen2::needs_roxygenize()`), or if a new roxygen file has no `.Rd` yet, so `devtools::document()` is run.
  - `check-pkgdown-index` (on edit / document): after `devtools::document()` or a `_pkgdown.yml` edit, blocks if the pkgdown reference index is out of sync with the package's exports.
  - `check-tests-before-commit` (on `git commit`): runs the full `devtools::test()` suite (with `NOT_CRAN=true`) before a commit and blocks it if any test fails, so red code never enters history. Runs even with `git commit --no-verify`. The tight edit/test loop during development stays targeted; the full suite is paid only at the commit boundary. Skips commits that cannot affect the suite (staged changes touch no R-relevant file, a message-only `--amend`, or an empty commit).
  - `check-rcmd-before-push` (on `git push`): runs `R CMD check` (via `devtools::check()`) before a push and blocks it if the check reports any error, so a broken package does not leave the machine. Warnings and notes are reported but do not block. The check runs only at the push boundary, which is infrequent. Skips pushes that cannot ship an R-relevant change (the pushed commits touch no R-relevant file, a branch-delete, or nothing to push).

  Both gates have a deliberate escape hatch: prefix the command with `R_PKG_GATE_SKIP=1` (e.g. `R_PKG_GATE_SKIP=1 git commit -m wip`, `R_PKG_GATE_SKIP=1 git push`) to bypass the gate for that one command. The bypass is announced on stderr, so it is always a conscious, visible choice, not a silent skip.

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
/plugin install r-pkg-dev@skills
```

To keep it updating from `main` automatically, ensure the marketplace has `autoUpdate: true` in your Claude settings (this is set when you add it through the marketplace, matching the other GitHub-backed marketplaces already in use).

Enable it per project (in that project's `.claude/settings.json`) or globally, whichever scope you prefer.

## Conventions source

The R code, dependency, data, documentation, lifecycle, and license rules draw on *R Packages* (2nd ed) by Hadley Wickham and Jennifer Bryan (https://r-pkgs.org) and the checks performed by `R CMD check`.
