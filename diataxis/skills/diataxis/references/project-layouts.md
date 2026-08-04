# Where each type lives in a real project

Diátaxis says nothing about tooling. This file answers the practical follow-up: given the four types, where does each one physically go in this repo? Read the section that matches the project; ignore the rest.

Two rules apply everywhere:

- **Never create the four sections empty.** Empty scaffolding advertises gaps and helps nobody. Sections get created when accumulated content demands them.
- A landing page (`README.md`, `index.qmd`, `index.md`) is **not** one of the four types. It is a signpost: what the thing is, how to install it, one minimal working example, then links out. Its characteristic failure is swelling into a tutorial.

## R package with pkgdown

| Type | Where it lives | The trap |
| --- | --- | --- |
| **Tutorial** | `vignettes/<pkg>.Rmd`, the get-started vignette reached by `vignette("<pkg>")` | Written as a how-to: no expected output shown, so the reader cannot tell whether they are on track. At most one tutorial; they are expensive to maintain against a moving package. |
| **How-to guide** | `vignettes/articles/how-to-*.Rmd` (built by pkgdown, kept off CRAN via `.Rbuildignore`; `usethis::use_article()` sets this up), or a plain vignette if it should ship | Titled with a noun (`Covariates`) instead of a goal (`How to add a covariate to a scenario`) |
| **Reference** | roxygen2 blocks (`@param`, `@return`, `@details`, `@examples`) rendered to `man/` and surfaced as the pkgdown Reference index | `@details` grows into an essay on *why*; `@examples` start teaching instead of illustrating |
| **Explanation** | a topic vignette or article, titled `About <topic>` | Never gets its own page; ends up sprinkled through `@details` and tutorial prose |

Specifics worth knowing:

- **Structure the `_pkgdown.yml` `reference:` sections to mirror the package's conceptual structure**, not alphabetically and not in file order. This is Diátaxis "respect the structure of the machinery" applied directly, and it is the single highest-value change available in most R packages: it immediately makes missing documentation visible.
- Group articles in `_pkgdown.yml` under `articles:` by type, so tutorials, how-to guides, and explanation are not one undifferentiated "Articles" list.
- `man/*.Rd` is generated. Fix reference problems in the roxygen block, never in `man/`.
- Link out of reference with `vignette("topic")` in roxygen text: pkgdown auto-links it. This is how `@details` stays descriptive while the *why* still reaches the reader.
- `@examples` are reference examples. They illustrate a call and its context. The moment one narrates a workflow or explains a choice, it belongs in a vignette.
- `NEWS.md` is **reference**: a factual list of changes. Rationale for a change goes in explanation, linked from the entry.
- `@seealso` and `@family` are the cheapest cross-type linking mechanism available. Use them to point from reference toward the relevant how-to guide and explanation.
- `CONTRIBUTING.md` is usually a how-to guide, or several. Run the compass on each part: setup steps are a how-to, the branching model is explanation, the commit conventions are reference.

## Quarto site or book

- Declare the types as sidebar sections in `_quarto.yml` under `website: sidebar: contents:`, each with an explicit `section:` name. Do this once there is content for at least two of them.
- `::: {.callout-note}` mid-tutorial is almost always explanation that should be a link. Callouts feel like a licence to digress inside a procedure; they are the main blur vector in Quarto documents. A callout that says *why* belongs in explanation; a callout that says *watch out, this is irreversible* legitimately belongs in a how-to guide.
- Executable code blocks make tutorials easier to keep reliable: rendering fails when the tutorial breaks. Prefer showing real rendered output over describing it.
- For a Quarto book, chapters are usually explanation, and mixing one how-to chapter among them reads as a discontinuity. Put how-to guides in their own part.

## Sphinx or MkDocs

- Top-level directories per type: `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/`. Create them as content arrives.
- Sphinx: one `toctree` per type, each with a `:caption:` naming the type. Autodoc output (`automodule`, `autoclass`) belongs under reference and nowhere else.
- MkDocs: mirror the same four groups in `nav:` in `mkdocs.yml`.
- Where the tooling supports it, structure the generated API reference to follow the package's module and class hierarchy rather than a flat list.

## Plain repository with a `docs/` directory and no site generator

Filename prefixes carry the type when there is no navigation to carry it: `how-to-deploy.md`, `about-authentication.md`, `getting-started.md`, `reference-config.md`. A flat directory of well-named files is a perfectly good state to be in, and better than a premature four-directory structure with one file in each.

## Wikis and Confluence-style spaces

Type belongs in the page title, because wiki navigation is usually too weak to convey it and search results show only the title. `How to …`, `About …`, `Getting started with …`. The dominant failure mode in wikis is the page that accreted all four types over years of edits; treat those with the splitting procedure in `auditing.md`.

---

Adapted from [Diátaxis](https://diataxis.fr) by Daniele Procida, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
