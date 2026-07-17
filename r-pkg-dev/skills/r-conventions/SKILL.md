---
name: r-conventions
description: R development conventions covering R code style, dependencies, DESCRIPTION, data, testing, documentation (NEWS.md, roxygen, pkgdown), lifecycle, and license. MUST be loaded for any R work, in a package or a plain R project. Load it as soon as the session opens, edits, creates, or reviews any .R, .r, .Rmd, or .qmd file, DESCRIPTION, NAMESPACE, NEWS.md, or _pkgdown.yml, or runs R code, R tests, or R CMD check. Also load it when reviewing or critiquing R code (a diff, a pull request, or a snippet). When in doubt whether the work is R, load it. Package-only rules (DESCRIPTION/NAMESPACE/NEWS/roxygen/pkgdown/lifecycle) are marked inside; the code-style and testing rules apply to all R code.
---

# R development conventions

Apply these whenever the current work touches R, not only when asked.

Scope: two sections, **Code style** and **Formatting**, are universal, they apply to any R code, in a package or a plain project (analysis scripts, a Quarto/RMarkdown project, loose `.R` files). The **Testing** section applies whenever tests exist. Everything else assumes an R *package* (a `DESCRIPTION` file) and is inert in a non-package project: the rules under **R code (below `R/`)**, **Dependencies**, **Documentation**, **Data**, **Running tests and R CMD check**, **Lifecycle**, and **License**. When there is no `DESCRIPTION`, follow only the universal and testing rules.

## R code (below `R/`)

*Package-only: these govern code under a package's `R/` directory.*

A guardrail hook enforces some of these (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`, bare `T`/`F`); the rest are by hand.

- No `library()`/`require()`/`source()` below `R/`. Declare deps in `DESCRIPTION` (`Imports`/`Suggests`), reach functions with `pkg::fun()`; when iterating use `devtools::load_all()`.
- Default to `pkg::fun()`. Import into `NAMESPACE` (`@importFrom`) only for operators, heavy use, or tight loops where `::` lookup cost matters.
- Never `:::` into another package (fails `R CMD check`); `::` for exported, same-package `mypkg:::internal()` is fine.
- Guard every `Suggests` use with `rlang::check_installed()`, `rlang::is_installed()`, or `requireNamespace("pkg", quietly = TRUE)`.
- `.R` files are almost entirely function definitions. Top-level code running at build time (`Sys.time()`, `system.file()`, `options()`, caching, aliasing `foo <- pkg::blah`) is a bug; move it inside a function.
- `.onLoad`/`.onAttach`/`.onUnload` go in `R/zzz.R`. S3 registration and `library.dynam()` in `.onLoad`; startup text in `.onAttach` via `packageStartupMessage()` (never bare `message()`); cleanup in `.onUnload`. `.First.lib`/`.Last.lib` forbidden.
- Hold mutable state in a top-level internal environment (`R/aaa.R`): `the <- new.env(parent = emptyenv())`. Never `<<-` to rebind a namespace object (bindings are locked).
- Leave the world as found: no `setwd()`, no writing to home or the working dir. Persistent data under `tools::R_user_dir()`, scratch under `tempdir()`.
- Keep `.R` ASCII for CRAN: `\uXXXX` escapes in code, literal non-ASCII only in comments.
- Export minimally. Internal utilities unexported (`@noRd`). Developer-facing-but-not-user-facing: `@export` plus `@keywords internal`. Prefer explicit `@export` over `exportPattern()`.

## Code style

*Universal: applies to all R code, package or not.*

- Base pipe `|>`, not `%>%`.
- Use `TRUE`/`FALSE`, never `T`/`F` (they can be rebound).
- `\() ...` for single-line anonymous functions; `function() {...}` for multi-line.
- Order a file's definitions exported-first, then the internal/helper functions (`@keywords internal`, unexported, `.`-prefixed) that support them.

## Formatting

*Universal: applies to all R code, package or not.*

- `.R` files are auto-formatted with [Air](https://posit-dev.github.io/air/) via a `PostToolUse` hook, so no manual `air format` is needed. Air does not support `.qmd`/`.Rmd`.
- Code-section syntax:
  ```
  # Section One ----
  # Section Two ====
  ### Section Three ####
  ```

## Dependencies (`DESCRIPTION`)

- `Imports`, not `Depends`. Reserve `Depends` for an R-version floor (`Depends: R (>= x.y.z)`), set only for a tested reason.
- Never depend on a meta-package (`tidyverse`, `devtools`); name the specific package.
- Every package in `NAMESPACE` (`import`/`importFrom`) must be in `Imports`/`Depends`; every package used in a test, vignette, or example must be a formal dependency (`Imports`/`Suggests`).
- Minimum versions with `>=` only, never `==`.
- For a newer feature of a dependency, bump its `Imports` floor (only `Imports` floors are enforced) or branch at run time on `packageVersion()` / `rlang::check_installed(version = )`.
- `Encoding: UTF-8`. No `Date:` field (tooling fills it). Custom fields prefixed `Config/` (e.g. `Config/Needs/website`).
- Opt into testthat edition 3: `Config/testthat/edition: 3`.

## Documentation

- Never hand-edit `man/` or `NAMESPACE` (nor resolve their conflicts by hand); regenerate with `devtools::document()` after changing roxygen or `@export`/`@import`.
- Every exported function has `@returns` and at least one runnable `@examples` (not all `\dontrun{}`); examples run well under the CRAN limit and leave the world unchanged.
- Prefer `try()` over `\dontrun{}` to show an error; never `\donttest{}` (CRAN runs it anyway). For a needed suggested package or precondition, use `@examplesIf cond()`, not an `if () {}` / `requireNamespace()` wrapper.
- Roxygen comments wrap at 80 characters.
- Keep `README.md` in sync via `devtools::build_readme()`; never hand-edit `README.md`.
- If `_pkgdown.yml` exists, keep it current after editing `vignettes/`, and keep the reference index in sync with exports.

`NEWS.md` (user-facing changes only, not small doc/internal changes):

- Frame each bullet as the net delta from the last release tag, for a user upgrading from the last released version, not the dev-cycle diff.
- Do not narrate intra-cycle churn: if a change supersedes/reverts a bullet from the same dev cycle, edit that bullet in place (or delete it if the net delta is now zero) instead of adding a sibling. Re-read and reconcile the dev-version section before adding.
- Function-related bullets lead with the function name; order bullets alphabetically by that name, non-function bullets first.
- Tidyverse structure (https://style.tidyverse.org/news.html): one line per bullet, present tense, positive framing; backtick every function/argument/file (functions with `()`); credit and link issues before the final period, e.g. `(@user, #123)`. Version is an `# pkg 1.2.3` heading; large releases group under `## Breaking changes` / `## New features` / `## Minor improvements and fixes`, breaking first.

## Testing

*Applies wherever tests exist. The testthat idioms are universal; `test_path()`, the `R/`<->`tests/testthat/` mirroring, and `tests/testthat.R` assume a package layout.*

Conventions for *writing* tests; for running them and R CMD check, see "Running tests and R CMD check".

- Self-sufficient: all setup inside the `test_that()` block, no shared mutable state.
- Files named `test-*.R`, mirroring `R/` source (`R/foofy.R` <-> `tests/testthat/test-foofy.R`). Only `helper*`, `setup*`, `test*` are auto-run.
- No `library()`/`source()` in tests (`load_all()` attaches testthat and your namespace). File-scope setup goes inside the test, in `R/`, or in `helper*.R`/`setup*.R`.
- Do not hand-edit `tests/testthat.R` (generated; runs only under `R CMD check`).
- `withr::local_*()` for any state change (`local_options`, `local_envvar`, `local_tempfile`, `local_tempdir`, `local_dir`); never bare `options()`/`Sys.setenv()`/manual cleanup.
- Fixtures via `test_path("fixtures", ...)`, never relative paths. Outputs to `withr::local_tempfile()`/`local_tempdir()`, never the package dir.
- `skip_on_cran()` (and `skip_if_offline()`, `skip_if_not_installed()`) per test, not hoisted to the file top, for slow/flaky/network tests.

Choosing an expectation:

- Errors and warnings: prefer `expect_snapshot(error = TRUE)` (errors) / `expect_snapshot()` (warnings) over `expect_error()` / `expect_warning()`, so the full text is reviewable.
- Several parts of one object: prefer `expect_snapshot()` (or `expect_snapshot_value()`) over multiple `expect_equal()`/`expect_identical()` on it (any object: list, vector, S3/S4/R6, data frame).
- Avoid `expect_true()`/`expect_false()` where a specific expectation exists (`expect_equal`, `expect_length`, `expect_named`, `expect_s3_class`, ...); specific ones give better failures.
- `expect_equal()` (not `expect_identical()`) for numeric comparisons (platform float variance). Do not assert on timing or core count.

## Data

- Each exported dataset is one `.rda` per object under `data/` (object name = file name), with `LazyData: true`. Never `@export` a dataset; document it by its name string in `R/` with `@format` and `@source`.
- Internal data in a single `R/sysdata.rda` (never documented, never under `data/`).
- Data-generation code in `data-raw/`, listed in `.Rbuildignore`, never below `R/`.

## Running tests and R CMD check

Run via `Rscript -e '...'` from the package directory (so the project `.Rprofile`, and an renv library, are picked up). Chain steps in one call (e.g. `devtools::load_all(); testthat::test_file("tests/testthat/test-foo.R")`) to pay R startup once. Always set `NOT_CRAN=true`; without it testthat skips `skip_on_cran()` tests, `expect_snapshot()` blocks, and other CRAN-gated cases, so a green run can hide unrun tests and never record a snapshot.

- Pick up changes with `devtools::load_all()`; never `R CMD INSTALL` / `install.packages()` the package under development to test an edit.
- Run `devtools::document()` before tests/check when roxygen or `@export`/`@import` changed (see Documentation).
- Run to completion, not to first failure: `devtools::test(stop_on_failure = FALSE)`; `export_all = TRUE` reaches internal functions. The count line is the signal.
- `devtools::check(error_on = "never")` returns the full report instead of aborting; `manual = FALSE` skips the PDF manual (no LaTeX); add `cran = TRUE` before release.

Tight loop, widening scope only once the narrower run passes (full `devtools::check()` is not part of this loop; it is the push gate below):

1. One `test_that()`: `testthat::test_file("tests/testthat/test-foo.R", desc = "specific description")`.
2. Whole file: `testthat::test_file("tests/testthat/test-foo.R")`.
3. Several files: `devtools::test(filter = "foo|bar")` (regex on file names, minus the `test-` prefix and extension).
4. Full suite: `devtools::test()`.

`devtools::test_active_file(path)` also does steps 1-2, but only pass a source path (`R/foo.R`) when `test-foo.R` exists, since it derives the test path from the name and errors "No test files found" otherwise. When source and test names diverged, use `devtools::test(filter = "foo")`.

### Inspecting a large run without context bloat

`test()`/`check()` output is big on a large package. Redirect the run to a log, scan a summary, and re-read one failure from the file instead of re-running. Write logs to a scratch path (`tempdir()` or the system temp area), never the package tree.

1. Run once into a log. The `llm` reporter (testthat's default under a coding agent; pass it explicitly so the format holds everywhere) prints nothing for passing tests, one block per problem, and a final count line:
   ```
   NOT_CRAN=true Rscript -e 'devtools::test(reporter = "llm", stop_on_failure = FALSE, export_all = TRUE)' > test.log 2>&1
   ```
2. Summary: `grep -E '^\[ (FAIL|OK)' test.log` -> `[ FAIL 5 | WARN 4 | SKIP 7 | PASS 102 ]`. `FAIL` 0 means green, stop.
3. Problem index, no backtraces: `grep -nE '^(ERROR|FAILURE|WARNING|SKIP):' test.log`. Each hit is `<log-line>:<TYPE>: 'file:line:col'`.
4. One failure in full: `Read` the log at that log-line `offset` with a small `limit` (a deep backtrace is ~15 lines).

`check()` is larger; log it the same way and index with `grep -nE '^Status:|checking .* \.\.\. (WARNING|ERROR|NOTE)' check.log`, then `Read` the flagged section. Do not pipe either through `tail`: it truncates from the top and drops the message and the start of each backtrace.

### Commit and push gates

- Commit green: `git commit` runs the full `devtools::test()` and blocks on any failure, so reach a green point first. The gate skips automatically when the commit touches no R-relevant file, is a message-only `--amend`, or is empty.
- Check clean before pushing: `git push` runs `R CMD check` and blocks on any error. Run `devtools::check()` yourself first (a few minutes) rather than hitting it at the gate. The gate skips automatically when the push ships no R-relevant change (docs-only commits, a branch-delete, nothing to push).
- Escape hatch, for genuine need only (e.g. a WIP checkpoint you will fix before it matters): prefix the command with `R_PKG_GATE_SKIP=1` to bypass that one gate, e.g. `R_PKG_GATE_SKIP=1 git commit -m "wip"`. The bypass is printed to stderr; do not use it to paper over a red suite or a failing check.

## Where to look for information

Read the authoritative source before guessing at a package's API or behaviour.

- pkgdown sites usually publish `llms.txt` at the doc-site root: `https://<pkg>.<org>.org/llms.txt` (e.g. `https://testthat.r-lib.org/llms.txt`, `https://dplyr.tidyverse.org/llms.txt`), a compact link index of functions and articles; fetch it to find the right reference page, then fetch that page. A 404 just means fall back to the reference index or local `?fun` / `help()`.
- For an installed package, local `?fun`, `help(package = "pkg")`, and `vignette(package = "pkg")` are authoritative for the version you have.

## Lifecycle and versioning

- Released version `major.minor.patch` (three parts, e.g. `1.0.0`); in-development adds `.9000`; a new package starts at `0.0.0.9000`.
- Deprecate in phases with `lifecycle::deprecate_warn(when, what, with)` and a `deprecated` badge in `@description`/`@param`; a deprecated argument defaults to `deprecated()`. Remove the surface only in a later (usually major) release.

## License and bundled code

- Standard open-source `License` field (from R's `license.db`) for CRAN; a full-text `LICENSE.md` copy listed in `.Rbuildignore`.
- Bundling third-party code: preserve its copyright/license headers, add the author `role = "cph"` in `Authors@R`, and (for CRAN, when the bundled license differs but is compatible) add a `LICENSE.note`. Check compatibility first (no GPL into MIT).
