---
name: diataxis
description: Write and restructure project documentation using Diátaxis, the framework of four documentation types (tutorials, how-to guides, reference, explanation) grounded in what the reader needs. Load this skill before writing or editing any user-facing documentation, including a README, a getting-started guide, an R vignette, a pkgdown or Quarto site, a docs/ directory, a CONTRIBUTING or ONBOARDING file, a wiki page, a migration guide, or roxygen and docstring prose. Also load it when asked to reorganize, split, audit, review, or "improve" existing docs, when a page feels bloated or confusing, when deciding where new content belongs, when a tutorial and a how-to guide are being confused, or when the user mentions Diátaxis, documentation structure, documentation types, or says their docs are a mess. Use it even when the request is just "write docs for this" and no framework is named.
---

# Diátaxis

Diátaxis holds that there are exactly four kinds of documentation, because a practitioner's needs vary along exactly two axes. The reader is either **acting** or **thinking**, and either **studying** (acquiring the skill) or **working** (applying it). Two axes, four quadrants, no fifth kind.

|                          | serves **study** (acquiring)              | serves **work** (applying)          |
| ------------------------ | ----------------------------------------- | ----------------------------------- |
| **action** (doing)       | **Tutorial** <br> "Can you teach me to…?" | **How-to guide** <br> "How do I…?"  |
| **cognition** (thinking) | **Explanation** <br> "Why…?"              | **Reference** <br> "What is…?"      |

Almost every documentation problem you will be handed is one document trying to occupy two quadrants at once: a tutorial padded with rationale, a how-to guide that stops to define its terms, reference material that editorializes, an explanation that breaks into instructions. Each blend fails **both** needs it tried to serve. The reader at work has to wade through teaching to reach the step they came for; the reader at study gets a fragmented lesson with no arc. This is the central insight and the reason the framework is worth following: the four types are not filing categories, they are four incompatible modes of writing.

## Step 1: name the quadrant before writing a word

Do not start drafting and let the type emerge. It will not; it will blur. Answer two questions first, out loud in your response, in one line:

1. **Action or cognition?** Does this content tell the reader what to *do*, or what is *true*?
2. **Acquisition or application?** Is the reader *studying* (building competence, no real task at hand) or *working* (has a real task, already competent)?

| informs…  | serves…     | so it is a…      |
| --------- | ----------- | ---------------- |
| action    | acquisition | **tutorial**     |
| action    | application | **how-to guide** |
| cognition | application | **reference**    |
| cognition | acquisition | **explanation**  |

Use the terms loosely if the exact words snag: action means doing, cognition means knowing, acquisition means study, application means work. Apply the two questions at any zoom level: to a whole site, a page, a section, even a single paragraph that feels out of place.

When intuition already gave you a confident answer, run the compass anyway on anything non-trivial. Confident intuition about documentation type is wrong often enough to be dangerous, and the compass costs two seconds.

## Step 2: check the title against the type

The title is the cheapest possible forcing function. A title that does not commit to a type is a document that will not either, and mis-typed titles are the most common defect in real documentation.

| Type             | Title shape                                                       | Good                                          | Bad                                                            |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| **Tutorial**     | "Getting started with X", "Your first X", "Build a X"             | `Build your first simulation`                 | `Simulations` (no promise of a lesson)                          |
| **How-to guide** | "How to \<verb\> \<object\>", says exactly what the guide shows   | `How to add a covariate to a scenario`        | `Adding covariates` (how? or whether?), `Covariates` (anything) |
| **Reference**    | A noun phrase naming the thing described                          | `run_simulation() arguments`                  | `How to run a simulation` (that is a how-to)                    |
| **Explanation**  | Reads with an implicit "About" in front                           | `About scenario inheritance`                  | `Scenario inheritance` (reference? how-to?)                     |

If you cannot write a title in one of these shapes, the content is not yet one type. Go back to step 1, and expect to split it.

## Step 3: write in that type's mode, and only that mode

Read the reference file for the type before drafting. Each one carries that type's purpose, its writing rules, its characteristic sentence patterns, what it must exclude, and a self-check list:

- **`references/tutorials.md`** for a lesson: a learning experience for someone acquiring competence.
- **`references/how-to-guides.md`** for directions: a competent reader with a real-world goal.
- **`references/reference.md`** for technical description: austere, neutral, structured like the machinery.
- **`references/explanation.md`** for discussion: context, why, alternatives, opinion.

## Step 4: when the other three types call, link, do not inline

While writing in one mode you will feel a pull toward the others. It is strongest as the urge to *explain*, and it is the single most damaging habit in technical writing: a well-meant explanation dropped into a tutorial dissolves the learner's focus exactly when they most need it. The urge to be complete is the same trap wearing different clothes, and it fills how-to guides with reference tables.

The move is always the same: **say the minimum the current mode needs, then link out**. One clause of rationale in a tutorial ("we use HTTPS here because it is safer") plus a link to the explanation is better than a paragraph, and it costs the reader nothing. Explanation is only wanted at the moment the *reader* wants it, which is not a moment the author gets to choose.

This is also why the four types make each other possible rather than competing. Content that would wreck a tutorial has a proper home elsewhere, where it can be developed properly and actually be findable.

## When one request spans several quadrants

"Document the export feature" or "write docs for this package" is not one document. Resolve it into separate documents, one per quadrant, and say which you are producing. A typical resolution:

- a tutorial, if a newcomer currently has no way in (at most one; tutorials are expensive to write and to maintain)
- one how-to guide per real user goal, named as a goal
- reference covering the actual surface, structured to mirror the code
- explanation for each "why" a user would plausibly ask

Then produce them as separate files, cross-linked. Do not deliver one long page with four headings; that is the collapse the framework exists to prevent, only tidier-looking.

## Working on documentation that already exists

Diátaxis is a guide, not a plan. Do not impose the structure top-down, and **never create the four sections empty**, waiting to be filled. Empty scaffolding is worse than a mess: it advertises gaps, helps nobody, and is explicitly warned against in the framework. The correct structure emerges from the inside as individual pieces get fixed.

So work in small, complete steps rather than a grand restructuring:

1. **Choose something.** Whatever is in front of you: the file you are in, the page just read. Do not hunt for the worst problem first. Something at random is fine.
2. **Assess it** against the standards: what reader need does this serve? How well? Do its language and logic match that mode?
3. **Decide one next action** that produces an immediate improvement.
4. **Do it, and treat it as done.** Commit it. Do not hold it back waiting for the rest.

Then repeat. When enough small fixes have accumulated, the material will start demanding to be moved under a type heading, and that is when the top-level structure gets created: because it is now needed, not in anticipation.

For diagnosing existing documentation, splitting a bloated page, and handling content that fits nowhere, read **`references/auditing.md`**.

For where each type physically belongs in an R package, a pkgdown site, or a Quarto/Sphinx/MkDocs project (including what `README.md`, `NEWS.md` and roxygen `@details` are and are not), read **`references/project-layouts.md`**.

## What this framework does not do

Diátaxis addresses whether documentation fits human needs, has flow, and anticipates the reader. It does nothing for accuracy, completeness, or consistency: those come from knowing the subject and checking the work, and no amount of correct structure substitutes for them.

It does, however, tend to *expose* those failures. Structuring reference to mirror the code makes missing pieces obvious. Pulling explanation out of a tutorial often reveals a step where the reader was quietly left to figure something out alone. Treat what surfaces during restructuring as findings to report, not noise.

---

Based on [Diátaxis](https://diataxis.fr) by Daniele Procida, used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The reference files in this skill are adaptations of that work and carry the same licence.
