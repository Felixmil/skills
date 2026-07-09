# skills

A personal Claude Code marketplace hosting plugins as subdirectories.

## Plugins

- **[`r-pkg-dev`](./r-pkg-dev)**: R package development conventions, guardrail hooks (air-format, R-code anti-patterns, pkgdown index), and the `r-btw` MCP server.
- **[`dev-crew`](./dev-crew)**: spec-writer, investigator, planner, builder, and reviewer subagents that drive an issue through spec (or investigate, for bugs), plan, build, and QA, plus skills to refine an issue, run the pipeline, debug a bug, update a branch, create a local issue, address a PR, and merge a PR.

## Install

Add this repo as a marketplace once, then install the plugins you want:

```
/plugin marketplace add Felixmil/skills
/plugin install r-pkg-dev@skills
/plugin install dev-crew@skills
```

With the marketplace registered and `autoUpdate` enabled, plugins update from `main` automatically. Enable each plugin per project (in that project's `.claude/settings.json`) or globally.
