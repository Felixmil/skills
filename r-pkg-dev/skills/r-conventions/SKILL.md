---
name: r-conventions
description: R package development conventions covering R code, dependencies, DESCRIPTION, data, testing, documentation (NEWS.md, roxygen, pkgdown), lifecycle, and license. Use whenever working in an R package, that is, when editing or creating .R, .Rmd, or .qmd files, DESCRIPTION, NAMESPACE, NEWS.md, or _pkgdown.yml, or when running R tests or R CMD check.
---

# R package development conventions

These are the conventions to follow in any R package. Apply them whenever the current work touches an R package, not only when explicitly asked.

This plugin also declares the `r-btw` MCP server, which exposes tools that read an R session (`mcp__r-btw__*`). They need the `btw` package but no `~/.Rprofile` setup: just try a tool, it works whether or not an interactive R session has registered. If the tools are unavailable, fall back to running `Rscript`/`R CMD` from the shell in the project directory, and point the user to this plugin's `scripts/r-btw-doctor.mjs` (`node scripts/r-btw-doctor.mjs`) to diagnose the r-btw setup. The conventions below do not depend on the MCP server.

## Agent workflow (work efficiently)

- Prefer the `r-btw` MCP tools over spawning fresh `Rscript` processes: `mcp__r-btw__btw_tool_pkg_load_all`, `mcp__r-btw__btw_tool_pkg_test`, `mcp__r-btw__btw_tool_pkg_document`, `mcp__r-btw__btw_tool_pkg_check`, and the `btw_tool_files_*` / `btw_tool_env_*` tools. When an interactive R session is attached they reuse it (live objects, warm `load_all()`, no per-call R startup); with none attached they still work, running in a fresh project-local process. Fall back to `Rscript`/`R CMD` only when the tools are unavailable.
- Trust but verify the session. A tool call runs either in an attached R session or, if none is attached, in a fresh process launched in the project. If a result does not match the current project (wrong package versions, unexpected files or objects), a session from another project is attached: call `list_r_sessions`, then `select_r_session` the one whose directory matches. See `references/btw-mcp.md` for the full procedure, the renv implications, and how to register the right session when you need live state.
- To pick up code changes, use `devtools::load_all()` (or `btw_tool_pkg_load_all`); never `R CMD INSTALL` / `install.packages()` the package under development just to test an edit.
- Work the tight loop: edit, `load_all()`, run the narrowest relevant test (`btw_tool_pkg_test` with a `filter`, or `testthat::test_file()`), and only widen scope once it passes. Reserve the slow full `devtools::check()` (`btw_tool_pkg_check`) for pre-release or when you need CRAN-like validation, not for every change.
- Commit at a point where the whole suite is green: `git commit` runs the full `devtools::test()` suite and blocks if anything fails, so reach a green stopping point before committing rather than committing mid-break.
- `git push` runs `R CMD check` and blocks on any error, so expect the push to take a few minutes and make sure the package checks cleanly before pushing.
- Run `devtools::document()` (`btw_tool_pkg_document`) after editing roxygen comments or changing `@export`/`@import` tags, before running tests or check, so `man/` and `NAMESPACE` are current.

## General

- Never edit files (or resolve merge conflicts) in `man/` or `NAMESPACE` manually. Regenerate them with `devtools::document()`.

## R code (below `R/`)

Some of the rules below are enforced by a guardrail hook shipped with this plugin (`library()`/`require()`/`source()`, cross-package `:::`, `setwd()`, `.First.lib`/`.Last.lib`, writing to `~`, and a warning on bare `T`/`F`). The rest are conventions to apply by hand.

- Never call `library()`, `require()`, or `source()` in code below `R/`. Declare dependencies in `DESCRIPTION` (`Imports`/`Suggests`) and reach functions with `pkg::fun()`; when iterating, use `devtools::load_all()`, never `source()`.
- Default to `pkg::fun()` for calls into other packages. Only import into your `NAMESPACE` (via `@importFrom`) when the object is an operator, is used very heavily, or is called in a tight loop where the `::` lookup cost matters.
- Never use `:::` to reach into another package's internal namespace; it fails `R CMD check`. Use `::` for exported functions. Same-package `mypkg:::internal()` is fine.
- Guard every use of a `Suggests` package with `rlang::check_installed()`, `rlang::is_installed()`, or `requireNamespace("pkg", quietly = TRUE)` before calling it.
- Use `TRUE`/`FALSE`, never the `T`/`F` shortcuts, as logicals (`T` and `F` can be silently rebound).
- `.R` files should be almost entirely function definitions. Any top-level code that runs at build time (`Sys.time()`, `system.file()`, `options()`, caching a result, aliasing `foo <- pkg::blah`) is a bug; move it inside a function so it runs at load or call time.
- Put `.onLoad`/`.onAttach`/`.onUnload` in `R/zzz.R`. S3 method registration and `library.dynam()` go in `.onLoad`; user-facing startup text goes in `.onAttach` via `packageStartupMessage()` (never bare `message()`); cleanup goes in `.onUnload`. `.First.lib`/`.Last.lib` are forbidden.
- Manage mutable package state with an internal environment defined at top level (typically `R/aaa.R`): `the <- new.env(parent = emptyenv())`. Never rely on `<<-` to rebind a namespace object; namespace bindings are locked.
- Leave the world as you found it: no `setwd()`, no writing to the user's home or working directory. Persistent user data goes under `tools::R_user_dir()`; scratch goes under `tempdir()` and is cleaned up.
- Keep `.R` files ASCII for CRAN. Express non-ASCII characters with `\uXXXX` escapes in code; literal non-ASCII is only acceptable in comments.
- Export as little as possible. Internal utilities stay unexported (document with `@noRd`, no `.Rd` generated). For a function that is developer-facing but not user-facing, use `@export` together with `@keywords internal`. Prefer explicit `@export` over `exportPattern()`.

## Dependencies (`DESCRIPTION`)

- Use `Imports` for package dependencies, not `Depends`. Reserve `Depends` for an R-version floor (`Depends: R (>= x.y.z)`), and set that floor only for a tested reason.
- Never depend on a meta-package (`tidyverse`, `devtools`); depend on the specific package you actually use.
- Every package referenced in `NAMESPACE` (via `import`/`importFrom`) must appear in `Imports` or `Depends`. Every package used in a test, vignette, or example must be a formal dependency (`Imports` or `Suggests`).
- Specify minimum versions with `>=` only, never an exact `==` pin.
- To use a newer feature of a dependency, either bump its minimum version in `Imports` (only `Imports` floors are enforced) or branch at run time on `packageVersion()` / `rlang::check_installed(version = )`.
- Set `Encoding: UTF-8`. Do not add a `Date:` field (tooling fills it at build time). Custom fields must be prefixed `Config/` (for example `Config/testthat/edition: 3`).
- Opt into the current testthat edition with `Config/testthat/edition: 3` in `DESCRIPTION`.

## Data

- Store each exported dataset as one `.rda` per object under `data/` (the object name matching the file name), and set `LazyData: true`. Never `@export` a dataset; document the dataset by its name string in `R/` with `@format` and `@source`.
- Put internal data in a single `R/sysdata.rda` (never documented, never under `data/`).
- Keep data-generation ("workflow") code in `data-raw/`, listed in `.Rbuildignore`, never below `R/`.

## Code style

- Use the base pipe `|>`, not the magrittr pipe `%>%`.
- Use `\() ...` for single-line anonymous functions; use `function() {...}` for multi-line ones.
- Within a single `.R` file, order definitions so user-facing (exported) functions come first, and internal/helper functions (`@keywords internal`, non-exported, or `.`-prefixed helpers) come after the exported functions they support.

## Formatting

- `.R` files are auto-formatted with [Air](https://posit-dev.github.io/air/) via a `PostToolUse` hook (shipped with this plugin), so no manual `air format` is needed after editing them. Air does not support `.qmd`/`.Rmd`; do not run it on those.
- Use standard syntax for code sections:
  ```
  # Section One ----
  # Section Two ====
  ### Section Three ####
  ```

## Testing

- Tests must be self-sufficient: all setup inside the `test_that()` block, no shared mutable state between tests.
- Test files are named `test-*.R` and mirror their `R/` source: `R/foofy.R` pairs with `tests/testthat/test-foofy.R`. Only `helper*`, `setup*`, and `test*` files are auto-run.
- Do not call `library()` or `source()` in test files; `devtools::load_all()` already attaches testthat and your package namespace. File-scope setup belongs inside the test, in `R/`, or in a `helper*.R`/`setup*.R` file, not as free-floating top-level code.
- Do not hand-edit `tests/testthat.R`; it is generated boilerplate that only runs under `R CMD check`.
- Use `withr::local_*()` for any state change in tests (`local_options`, `local_envvar`, `local_tempfile`, `local_tempdir`, `local_dir`). Never bare `options()`, `Sys.setenv()`, or manual cleanup.
- Fixture paths via `test_path("fixtures", ...)`, never relative paths. Outputs go to `withr::local_tempfile()` / `local_tempdir()`, never the package directory.
- For errors and warnings, prefer `expect_snapshot(error = TRUE)` (errors) and `expect_snapshot()` (warnings) over `expect_error()` / `expect_warning()`, so the full message text is reviewable.
- Avoid `expect_true()` / `expect_false()` when a more specific expectation exists (`expect_equal`, `expect_length`, `expect_named`, `expect_s3_class`, etc.); specific expectations give better failure messages.
- Use `expect_equal()` (not `expect_identical()`) for numeric comparisons, since floating-point results vary by platform. Do not assert on timing or on a specific number of cores.
- When asserting several parts of the same object (e.g. `object$id`, `object$value`, `object[["x"]]`), prefer `expect_snapshot()` (or `expect_snapshot_value()`) over multiple `expect_equal()` / `expect_identical()` calls on the same object. Applies to any object: list, named vector, S3/S4/R6, data frame, etc.
- Apply `skip_on_cran()` (and `skip_if_offline()`, `skip_if_not_installed()`) per test, not hoisted to the file top, for long-running, flaky, or network-dependent tests. Keep the whole suite fast (aim for well under a minute).
- After a code change, escalate test scope progressively. Only broaden scope once the narrower run passes:
  1. Single `test_that()` block: `testthat::test_file("tests/testthat/test-foo.R", desc = "specific description")`
  2. Whole file: `testthat::test_file("tests/testthat/test-foo.R")`.
  3. Several files: `devtools::test(filter = "foo|bar")` (the `filter` regex matches file names, without the `test-` prefix or extension).
  4. Full suite: `devtools::test()`.
- `devtools::test_active_file(...)` is an alternative for steps 1-2, but mind how it resolves the test file. Given a test file (`tests/testthat/test-foo.R`) it always works. Given a source file (`R/foo.R`) it derives the test path from the name (`test-foo.R`) and errors with "No test files found" when that file does not exist, so only pass a source path when the matching `test-{name}.R` exists. When source and test names do not correspond (common in packages where naming has drifted), use `devtools::test(filter = "foo")` instead.
- Always run tests with `NOT_CRAN=true` set in the environment (e.g. `NOT_CRAN=true Rscript -e '...'`). Without it, testthat treats the run as a CRAN context and silently skips `skip_on_cran()` tests, `expect_snapshot()` blocks, and other CRAN-gated cases, so a passing run can hide unrun tests and never record a new snapshot.
- Never pipe tests into `tail`. `summaryReporter` already returns condensed results.

## Documentation

- Update `NEWS.md` when making a user-facing change. The audience of a bullet is a user upgrading from the **last released version**, not someone reading the dev-cycle diff. Frame every bullet as the net delta from the last release tag to the upcoming release.
- Do not add a bullet for a change that only modifies behaviour introduced earlier in the **same** development cycle. If your change supersedes, refines, or reverts an existing bullet in the development-version section, edit that bullet in place (or delete it if the net delta from the last release is now zero) rather than appending a sibling bullet that narrates the intra-cycle journey.
- Before adding or editing a bullet, re-read the existing development-version section and reconcile each bullet that touches the area you changed against the current branch state. A bullet that was accurate when written may now be misleading.
- Do not add bullets for small documentation changes or internal refactorings.
- When a bullet relates to a specific function, put the function name early in the bullet. Order the bullets within a section alphabetically by that function name, with any bullets that do not relate to a specific function placed first.
- Follow the tidyverse `NEWS.md` structure (https://style.tidyverse.org/news.html): write each bullet for a user (not a developer), as a single line ending with a period, in the present tense, framed positively (what now happens, not what no longer breaks). Wrap every function, argument, and file name in backticks, functions with trailing parens (`fun()`). Credit external contributors and link issues in parentheses just before the final period, e.g. `(@user, #123)`. Each version is a level-1 heading (`# pkg 1.2.3`); for a large release, group bullets under level-2 headings (`## Breaking changes`, `## New features`, `## Minor improvements and fixes`), with breaking changes first.
- If `_pkgdown.yml` exists, always make sure it is up to date after editing files in `vignettes/`, and keep the reference index in sync with the package's exports.
- Every exported function documents its return value with `@returns` and has at least one runnable `@examples` (not everything wrapped in `\dontrun{}`). Examples must run in well under the CRAN limit and leave the world unchanged.
- Prefer `try()` over `\dontrun{}` to show an error in an example. Do not use `\donttest{}` (CRAN runs it anyway). For examples that need a suggested package or other precondition, use `@examplesIf cond()` rather than wrapping the body in `if () {}` or `requireNamespace()`.
- Keep `README.md` in sync with `README.Rmd`: render with `devtools::build_readme()`, never hand-edit `README.md`.
- Roxygen comment blocks wrap at 80 characters.

## Lifecycle and versioning

- Version numbers: a released version is `major.minor.patch` (always three parts, e.g. `1.0.0`, never `1.0`); an in-development version adds a fourth `.9000` component; a new package starts at `0.0.0.9000`.
- Deprecate in phases with `lifecycle::deprecate_warn(when, what, with)` and a `deprecated` lifecycle badge in the `@description`/`@param`. For a deprecated argument, use `arg = deprecated()` as its default. Remove the deprecated surface only in a later (usually major) release.

## License and bundled code

- Use a standard open-source `License` field (from R's `license.db`) for CRAN. A full-text `LICENSE.md` copy must be listed in `.Rbuildignore`.
- When bundling third-party code, preserve its copyright and license headers, add the author with `role = "cph"` in `Authors@R`, and (for CRAN, when the bundled license differs but is compatible) add a `LICENSE.note`. Check license compatibility before bundling (you cannot bundle GPL code into an MIT package).
