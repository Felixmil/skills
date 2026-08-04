# How-to guides

**A how-to guide is directions.** It helps a competent reader get something done, correctly and safely. It is goal-oriented and concerned with *work*: crossing from one side of a real-world problem to the other.

Read this before writing anything that answers "how do I…?", any troubleshooting page, any task-focused article.

## Written from the reader's problem, not the tool's features

**This is the rule that decides whether a how-to guide is worth anything.** A how-to guide exists because a human has a project. It must show what that human needs to do, with the tools available, to get the result they need.

The common failure is the opposite: guides defined by what the machinery can be made to do, walking the tool through its motions. Compare:

- "To shut off the flow of water, turn the tap clockwise."
- "To deploy the desired database configuration, select the appropriate options and press **Deploy**."

These look like guidance and are not. They tell a competent practitioner what standard interfaces and basic competence already told them, and they are severed from any purpose. What the reader actually needs is *how much water to run and how vigorously, for this purpose*, or *which configuration options match which real-world needs*.

Tools appear in a how-to guide as incidental bit-players, the means to the reader's end. Often a good guide cuts across several tools or subsystems, joined together by the thing a person is trying to accomplish. The project defines the coverage, not the module boundary.

Good scope: *how to calibrate the radar array*, *how to use fixtures in pytest*, *how to configure reconnection back-off policies*. Not a how-to guide: *how to build a web application*, which names no specific goal and is an open-ended field of skill.

A rich list of how-to guides is also how readers see what a product can actually *do*. Well-chosen ones are usually the most-read pages in a documentation set.

## Key principles

### Maintain focus on the goal

Assume a reader who knows what they want to achieve and can follow instructions correctly. Action and only action; no digression, no teaching. The temptations are to explain and to be complete for completeness's sake. Neither guides the reader's work. If they matter, link to them.

### Address real-world complexity

A guide useful only for the exact narrow case you had in mind is rarely worth having. You cannot enumerate every case, so stay open to the range: give the reader enough that they can adapt the guidance to their situation.

Solving a problem is not always reducible to a linear procedure. Real sequences fork, overlap, and have several entry and exit points. Often the reader must apply judgement, so a how-to guide should address how they *think* as well as what they *do*: "actions" includes deciding.

### Omit the unnecessary

**Practical usability beats completeness.** Unlike a tutorial, a how-to guide need not be end-to-end. Start and end at reasonable, meaningful points, and leave the reader to join it up to their own work.

### Describe a logical sequence

The fundamental structure is a sequence, and the order should mean something. Sometimes it is forced (step two needs step one). Sometimes it is subtler: if one operation sets up the reader's environment or their thinking in a way that helps the next, that is reason enough to put it first.

### Seek flow

Ground the sequence in the patterns of the reader's own activity and thinking so the guide acquires flow.

Obvious flow failures: making the reader ping-pong between tools or contexts. Look deeper than that. What are you asking them to think about, and does their attention move sensibly from subject to subject? How long must they hold an open thought before it resolves into action? If you send them back to an earlier concern, was that avoidable?

Action has pace and rhythm, and a guide to action does too. At its best, a how-to guide seems to *anticipate* the reader: the documentation equivalent of an assistant who already has the tool you were reaching for.

### Pay attention to naming

**Choose a title that says exactly what the guide shows.**

- good: *How to integrate application performance monitoring*
- bad: *Integrating application performance monitoring* (maybe it is about whether you should)
- very bad: *Application performance monitoring* (how? whether? what it is?)

Search engines value good titles as much as humans do.

## The language of how-to guides

| Pattern | Why |
| --- | --- |
| "This guide shows you how to…" | Names the problem or task precisely |
| "If you want x, do y. To achieve w, do z." | Conditional imperatives: real problems branch |
| "In the case of …, an alternative approach is to…" | Real-world routes differ; say so |
| "Refer to the \<x\> reference for the full list of options." | Do not pollute the guide with everything related to x |

## Excluded from how-to guides

- Teaching, and anything that assumes the reader is a beginner
- Rationale and background (link to explanation)
- Exhaustive reference tables (link to reference)
- Explaining what standard interfaces or basic competence already make obvious
- Steps that exist only to make the guide look complete

## Before calling it done

- Does the title say exactly what the guide shows, in "how to \<verb\>" form?
- Is it framed by a human goal, or by a tool's feature list?
- Can a reader adapt it to a case slightly different from the one described?
- Does it branch where the real world branches?
- Has every explanation been replaced by a link?
- Does the ordering have a reason, and does the reader's attention flow without backtracking?
- Is there anything a competent practitioner would find insulting to be told?

## Not a tutorial

Both are ordered steps; the need differs. A how-to guide assumes competence and familiarity, takes place in the real world, cannot promise safety, forks and branches, and leaves the reader responsible for getting into and out of trouble. A tutorial assumes none of that. Basic-versus-advanced is *not* the distinction: how-to guides can and should cover mundane routine procedures. See `auditing.md`.

---

Adapted from [Diátaxis](https://diataxis.fr) by Daniele Procida, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
