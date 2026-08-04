# Tutorials

**A tutorial is a lesson.** It is a practical activity in which the reader learns by doing something meaningful, under the guidance of a tutor who is not there. Its purpose is not to get the reader's task done; it is to build competence and confidence.

Read this before writing any getting-started guide, "your first X", onboarding walkthrough, or introductory vignette.

## The contract

A lesson is a contract in which nearly all responsibility falls on the teacher: for what the reader learns, for what they do in order to learn it, and for their success. The reader's only obligation is to follow along attentively. They are not obliged to learn, understand, or remember anything.

That asymmetry is why tutorials are hard and why so few are good. The exercise you put the reader through must be:

- **meaningful**: they get a real sense of achievement
- **successful**: they can actually complete it
- **logical**: the path through it makes sense
- **usefully complete**: they encounter every action, concept, and tool they need to become familiar with

Note the split between *what is done* and *what is learned*. The reader builds a small app; what they actually acquire is the names of things, the shape of the workflow, which command does what, how the pieces relate. Decide the second list first, then design an activity that delivers it.

## Key principles

### Do not try to teach

The first rule of teaching is: do not try to teach. The job is to provide an experience through which the reader can learn, then trust that they will. The anxiety to impart knowledge is natural, and giving in to it by telling and explaining is what wrecks tutorials. Give them things to *do*.

### Show where they are going, at the start

State the destination up front so the reader can picture it and see themselves building toward it: "In this tutorial we will create and deploy a scalable web application. Along the way we will meet containerisation tools."

Do **not** write "In this tutorial you will learn…". It presumes an outcome that is not yours to promise, and it is a poor pattern.

### Deliver visible results early and often

Understanding comes from connecting cause to effect. Every step should produce a comprehensible result, however small, and the reader should be able to see it. A long stretch of setup with no visible output is a stretch where learning stops.

### Maintain a narrative of the expected

At every step the reader feels a flicker of anxiety: did that work? Answer it before they have to ask.

Show actual expected output. Narrate what is coming: "After a few moments, the server responds with…", "The command will probably print several hundred lines of logs." Where you know the likely failure, flag it: "If the output does not show X, you have probably forgotten Y."

### Point out what they should notice

Learning needs reflection, and a reader busy following instructions will not notice the signs around them unless prompted. Close the loop in passing: point out how the prompt changed, what appeared in the log, what the new file is called. Observing is an active skill and it is usually neglected.

### Permit and encourage repetition

Readers repeat steps that succeeded, just to confirm the same thing really happens again. That repetition is often the only teacher available. Where you can, make steps repeatable; be careful with irreversible operations that strand the reader and make going back impossible.

### Ruthlessly minimise explanation

**A tutorial is not the place for explanation.** The reader is focused on following directions and getting results. Explanation pulls their attention off that and blocks the learning.

"We use HTTPS because it is more secure" is enough. Link to the real discussion so it is available without being in the way. Even experienced teachers find this the hardest rule to accept, because once you have understood something you naturally want to frame it abstractly, and abstraction is the enemy here.

### Focus on the concrete

Lead the reader from *this* action to *this* result. It may feel like withholding the general pattern, but the opposite is true: minds are excellent at inferring general patterns from concrete examples, and all learning moves from the particular toward the abstract, never the reverse.

### Ignore options and alternatives

Other flags, other approaches, other ways to call the API: ignore them. Guidance stays on what is needed to reach the conclusion. This keeps the tutorial short and spares both of you cognitive work.

### Aspire to perfect reliability

Confidence is built layer by layer and is easily shaken. A reader who follows the steps and does not get the promised result loses faith in the tutorial, the author, and themselves, in that order. A present teacher can rescue them; you cannot. The tutorial must be built so things *cannot* go wrong, for every reader, every time.

You will not find all the flaws yourself. Assume the first version has gaps, and expect to learn about them from watching real readers.

## The language of tutorials

| Pattern | Why |
| --- | --- |
| "We…" (first-person plural) | Affirms the tutor/learner relationship: you are not alone in this |
| "In this tutorial, we will…" | States what will be accomplished |
| "First, do x. Now do y. Now that you have y, do z." | No room for ambiguity or doubt |
| "We must do x before y because … (see \<link\> for details)" | Minimal explanation, in the simplest language, then link out |
| "The output should look something like…" | Sets clear expectations |
| "Notice that… Remember that… Let's check…" | Clues that confirm they are on track |
| "You have now built a working X." | Names, and mildly admires, what they accomplished |

## Excluded from tutorials

- Extended explanation or rationale (link instead)
- Options, alternatives, "you could also…"
- Complete reference tables of flags or parameters
- Anything unnecessary to reaching the conclusion
- Real-world caveats and edge cases that belong in a how-to guide

## Before calling it done

- Does the opening state what will be built?
- Does every step produce a result the reader can see?
- Is expected output shown, not just described?
- Have all explanations been reduced to a clause and a link?
- Are all alternatives and options gone?
- Would a first-timer with only the stated prerequisites finish successfully, every time?
- Has it actually been run end to end from a clean state?

## Not a how-to guide

A tutorial and a how-to guide are both ordered steps, which is why they get conflated. The difference is the need. A tutorial serves the reader **at study**: managed conditions, no choices, safe to restart, teacher owns the failures. A how-to guide serves the reader **at work**: the real world, forks and branches, cannot promise safety, reader owns the failures. See `auditing.md` for the full contrast.

Difficulty is not the axis. A tutorial can teach something advanced, and a how-to guide can cover something basic and routine.

---

Adapted from [Diátaxis](https://diataxis.fr) by Daniele Procida, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
