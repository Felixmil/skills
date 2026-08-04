# Diagnosing and restructuring existing documentation

Read this when asked to review, audit, reorganize, split, or "improve" documentation that already exists, or when a page feels bloated, confusing, or hard to maintain.

## The four types at a glance

| | Tutorial | How-to guide | Reference | Explanation |
| --- | --- | --- | --- | --- |
| what it does | introduce, educate, lead | guide | state, describe, inform | explain, clarify, discuss |
| answers | "Can you teach me to…?" | "How do I…?" | "What is…?" | "Why…?" |
| oriented to | learning | goals | information | understanding |
| purpose | provide a learning experience | help achieve a particular goal | describe the machinery | illuminate a topic |
| form | a lesson | a series of steps | dry description | discursive discussion |
| cooking analogy | teaching a child to cook | a recipe | the information on a food packet | a book on culinary history |

The cooking analogies are the fastest sanity check available. If a page claims to be a recipe but reads like a cooking lesson, you have found the defect.

## Where blur happens

Each type has a natural affinity with its neighbours, and that is exactly where the boundaries collapse:

| shared property | the pair that blurs |
| --- | --- |
| both guide action | tutorials and how-to guides |
| both serve work | how-to guides and reference |
| both hold propositional knowledge | reference and explanation |
| both serve study | tutorials and explanation |

The worst and most common case is total or partial collapse of tutorials and how-to guides into each other, which makes it impossible to serve either need. It is also the most damaging, because it obstructs precisely the newcomers you were hoping to turn into users.

## Tutorial or how-to guide? The full contrast

They look alike: both are ordered steps, both promise that following them leads somewhere, both are useless to anyone whose hands are not on the machinery. The distinction is whether the reader is **at study** or **at work**.

| Tutorial (at study) | How-to guide (at work) |
| --- | --- |
| helps the reader acquire basic competence | helps an already-competent reader do a task correctly |
| provides a learning experience; what matters is what they do and feel | directs the reader's work |
| a carefully managed path with required encounters along it | aims at a result; the path cannot be managed, the real world intrudes |
| familiarises: tools, vocabulary, processes, how things respond | assumes familiarity with all of it |
| a contrived setting, arranged in advance for success | the real world, with whatever it throws at you |
| eliminates the unexpected | prepares for the unexpected and says how to handle it |
| a single line, no choices or alternatives | forks and branches: "if this, then that" |
| must be safe; always possible to start over | cannot promise safety; sometimes one chance to get it right |
| responsibility lies with the teacher | responsibility lies with the reader |
| the reader may lack the competence even to ask the questions it answers | assumes the reader is asking the right question already |
| explicit about basics: where to type, how long to wait | relies on that as implicit knowledge |
| concrete and particular: the specific tools and conditions provided | general: real-world specifics are unknowable in advance |
| teaches skills applicable to many later cases | serves one particular task now |

**Difficulty is not the axis.** How-to guides can, do, and often should cover basic routine procedures. Tutorials can teach advanced material to already-expert readers. The axis is study versus work.

Why it matters beyond tidiness: a clinical manual that tried to teach while guiding a live procedure would kill people. Software documentation gets away with the same conflation because the cost is only confusion and abandonment, but the cost is real, and it lands hardest on newcomers.

## Reference or explanation?

The test: is this something a reader turns to *while working*, executing a task? Or something they need once they have stepped away and want to think about it? Reference serves application; explanation serves acquisition.

Fast heuristics:

- If it is boring and unmemorable, it is **reference**.
- Lists of things (classes, methods, attributes, flags) and tables of information are **reference**.
- If you can imagine reading it in the bath, it is **explanation**.
- If it is the answer to "can you tell me more about X?" asked over a drink, it is **explanation**.

The usual slip: reference material becomes expansive around an illustrative example, the example grows to say *why* or *what if*, and now there is explanation embedded in reference. Bad for the reference, which is interrupted, and bad for the explanation, which never gets to develop properly.

## Auditing procedure

Work in small complete steps, not a grand restructuring. For each page or section:

1. **Run the compass.** Action or cognition? Acquisition or application? Name the type it *should* be.
2. **Compare with what it actually is.** Read the title, then the opening, then scan for out-of-type passages: rationale inside steps, steps inside description, options inside a lesson, tables inside a discussion.
3. **Check the title** against the shapes in SKILL.md. A mis-typed title usually means a mis-typed document.
4. **Name one action** that improves it immediately.
5. **Do it and commit it.** Do not hold it back for a bigger release.

Then repeat. The top-level structure gets created later, when accumulated fixes make the material demand a type heading. **Never create the four sections empty in anticipation.**

## Splitting a page that serves two needs

The most common repair. In order:

1. Identify the dominant type: what does the majority of the page do, and what does its position in the navigation promise?
2. Cut the out-of-type material out whole, into a new page of its own type, titled in that type's shape.
3. Replace each cut with the minimum the host mode needs plus a link. One clause of rationale and a link, not a paragraph.
4. Check the host page still flows: cuts often reveal that the removed passage was carrying a transition, or hiding a step where the reader was silently left to work something out alone.
5. Check the new page stands alone: extracted explanation usually needs an opening that establishes its own topic.

## Content that fits nowhere

Some pages resist all four types. Usual causes and resolutions:

- **A README or landing page.** Not one of the four; it is a signpost. Keep it to what the thing is, how to install it, one minimal example, and links to the four types. Its characteristic failure is swelling into a tutorial.
- **A page that is really navigation.** Leave it as an index. Do not force prose onto it.
- **Release notes and changelogs.** Reference: a factual list. Rationale for a change belongs in explanation, linked.
- **A grab-bag "notes" or "misc" page.** Not a type, a symptom. Its contents almost always split cleanly across three or four types once each item is run through the compass individually.
- **Something genuinely for maintainers, not users.** Still one of the four types, just addressed to a different practitioner. Run the compass with the maintainer as the reader.

## What restructuring will expose

Diátaxis cannot deliver accuracy, completeness, or consistency: those come from knowing the subject and checking the work. But it reliably *exposes* where they are missing, and that is a large part of the value of an audit.

Expect to surface: coverage gaps, once reference is structured to mirror the code; steps where the reader was quietly abandoned, once padding explanation is pulled out of a tutorial; how-to guides that were never framed by a real user goal; features documented nowhere at all.

Report these as findings. They are usually more valuable than the restructuring itself, and they are not yours to silently fix while moving text around.

---

Adapted from [Diátaxis](https://diataxis.fr) by Daniele Procida, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
