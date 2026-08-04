# diataxis

A Claude Code plugin that puts the [Diátaxis](https://diataxis.fr) documentation framework in front of the agent before it writes a line of documentation.

## What it does

Diátaxis holds that there are exactly four kinds of documentation, because a practitioner's needs vary along exactly two axes: the reader is either acting or thinking, and either studying or working.

|                      | serves study     | serves work      |
| -------------------- | ---------------- | ---------------- |
| **action** (doing)   | tutorial         | how-to guide     |
| **cognition** (knowing) | explanation   | reference        |

Left alone, an agent asked to "write docs" produces one long page that tries to occupy all four quadrants at once, which fails every reader it was written for. The skill forces the reader's need to be named first, then holds the writing to that one mode.

## The skill

`diataxis` loads on documentation work: writing or editing a README, a getting-started guide, an R vignette, a pkgdown or Quarto site, a `docs/` directory, a wiki page, roxygen prose, and on requests to audit, split, or reorganize documentation that already exists.

It provides:

- **The compass**, run before drafting: action or cognition, acquisition or application, therefore this type.
- **Title conventions per type**, the cheapest forcing function available for catching a mis-typed document.
- **Per-type writing guidance** in `references/`: purpose, principles, characteristic sentence patterns, exclusions, and a self-check list for tutorials, how-to guides, reference, and explanation.
- **A diagnosis pass** (`references/auditing.md`): where the types blur, the full tutorial-versus-how-to contrast, splitting a page that serves two needs, and handling content that fits nowhere.
- **Layout mapping** (`references/project-layouts.md`): where each type physically belongs in an R package with pkgdown, a Quarto site, Sphinx/MkDocs, a plain `docs/` directory, or a wiki.

It also carries the framework's stance on process: work in small complete steps, publish each one, and never create the four sections empty waiting to be filled.

## Install

```
/plugin marketplace add Felixmil/skills
/plugin install diataxis@skills
```

## Attribution

Based on [Diátaxis](https://diataxis.fr) by Daniele Procida, used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The skill's `SKILL.md` and `references/` are adaptations of that work and carry the same licence; the rest of the plugin is MIT.
