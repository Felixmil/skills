# skills

A personal Claude Code marketplace hosting plugins as subdirectories.

## Plugins

- **[`r-pkg-dev`](./r-pkg-dev)**: R package development conventions, guardrail hooks (air-format, R-code anti-patterns, pkgdown index), and the `r-btw` MCP server.

## Install

Add this repo as a marketplace once, then install the plugins you want:

```
/plugin marketplace add Felixmil/skills
/plugin install r-pkg-dev@skills
```

With the marketplace registered and `autoUpdate` enabled, plugins update from `main` automatically. Enable each plugin per project (in that project's `.claude/settings.json`) or globally.
