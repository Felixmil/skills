# skills

A personal Claude Code marketplace hosting plugins as subdirectories.

## Plugins

- **[`r-dev`](./r-dev)**: R package development conventions, guardrail hooks (air-format, R-code anti-patterns, pkgdown index), and the `r-btw` MCP server.
- **[`dev-crew`](./dev-crew)**: spec-writer, investigator, planner, builder, and reviewer subagents that drive an issue through spec (or investigate, for bugs), plan, build, and QA, plus skills to refine an issue, run the pipeline, debug a bug, update a branch, create a local issue, address a PR, and merge a PR.
- **[`diataxis`](./diataxis)**: the Diátaxis documentation framework as a skill: name the reader's need before drafting, per-type writing rules and title conventions for tutorials, how-to guides, reference and explanation, a diagnosis pass for documentation that has blurred its types, and a mapping onto R package, pkgdown, Quarto and Sphinx/MkDocs layouts.

## Install

Add this repo as a marketplace once, then install the plugins you want:

```
/plugin marketplace add Felixmil/skills
/plugin install r-dev@skills
/plugin install dev-crew@skills
/plugin install diataxis@skills
```

With the marketplace registered and `autoUpdate` enabled, plugins update from `main` automatically. Enable each plugin per project (in that project's `.claude/settings.json`) or globally.
