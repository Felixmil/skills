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

## Recognising a type in prose someone else wrote

Writing rules tell you how to produce a type. Recognising one in existing text is a different job, and it runs on surface signals. Read the whole page before deciding: the opening paragraph and the title routinely misrepresent what follows.

| Signals in the text | Points to |
| --- | --- |
| Numbered steps building one continuous artifact; "we will"; expected output shown; reassurance and checkpoints; one fixed path with no options; pinned versions | **Tutorial** |
| A goal stated up front; prerequisites; conditional steps ("if X, then Y"); assumes competence; branches and alternatives; ends when the goal is met | **How-to guide** |
| Declarative statements of fact; tables and lists; parameters, flags, signatures, error codes; alphabetical or hierarchical ordering; uniform entry format; no narrative | **Reference** |
| Discursive prose; "the reason for this is"; history and design decisions; comparisons and trade-offs; hedging and acknowledged opinion; no steps at all | **Explanation** |

Two fast tests for the pair that blurs most often in theory-side content:

| Question | Yes | No |
| --- | --- | --- |
| Would someone consult this while their hands are on the machinery? | Reference | Explanation |
| Could you imagine reading it in the bath? | Explanation | Reference |
| Is it mostly lists, tables, or specifications? | Reference | Explanation |
| Does it mainly answer "why"? | Explanation | Reference |

**Ignore where the file lives.** A directory named `tutorials/` is evidence of nothing; in most real doc sets it holds how-to guides, a couple of explanations, and at least one reference table. The same goes for a `type:` field in frontmatter. Classify on the page's dominant purpose and voice, and treat the location as a *claim* to be checked, not an answer.

That gives the sharpest framing for an audit finding: **declared type versus actual type**. What does this page's location, navigation entry, or frontmatter promise a reader, and what does the page actually deliver? Every mismatch is either a page to fix or a promise to correct.

## Checking coverage: which type is missing

Splitting and re-typing pages assumes the content exists. Often the more serious finding is that an entire type is absent, and readers fail in a way that is easy to misread as a quality problem.

Work from the observed failure back to the missing type:

| What readers experience | What is missing |
| --- | --- |
| Newcomers cannot get started at all, or bounce off; every entry point assumes knowledge they lack | **Tutorial** |
| Competent users know what they want but cannot work out how to do it; they ask questions whose answers exist nowhere | **How-to guide** |
| People cannot find a fact, or resort to reading source code to learn what a parameter does | **Reference** |
| People use it correctly but do not understand why, cannot make judgement calls, and repeat the same confusions | **Explanation** |

For a subject-by-subject check, take the units your readers actually care about (a feature, a workflow, a subsystem) and ask which of the four exist for each. A feature with thorough reference and no how-to guide is a real gap even though its documentation looks substantial, and this is the single most common shape of an incomplete doc set: generated reference plus nothing else.

Report gaps as gaps. Do not fill them silently while restructuring, and do not treat an absent quadrant as an instruction to write one immediately: a gap nobody is failing on is not urgent, and the reader failures above are what make it urgent.

## Auditing procedure

Work in small complete steps, not a grand restructuring. For each page or section:

1. **Read the whole page.** Not the title, not the first paragraph. Classification from either is unreliable.
2. **Note the declared type**: what its location, navigation entry, or frontmatter claims it is.
3. **Infer the actual type** from the signals table above, and from the compass: action or cognition, acquisition or application.
4. **Scan for out-of-type passages**: rationale inside steps, steps inside description, options inside a lesson, tables inside a discussion.
5. **Check the title** against the shapes in SKILL.md. A mis-typed title usually means a mis-typed document.
6. **Name one action** that improves it immediately.
7. **Do it and commit it.** Do not hold it back for a bigger release.

When reporting on more than one page, give per page: the path, the declared type, the inferred type, your confidence (high, medium, low), whether it is mixed and which other types it carries, and a one-line reason. Low confidence is a useful signal in itself and worth stating plainly rather than resolving by guesswork.

A page is **mixed** when it substantially serves more than one need, sometimes three or four. Still name a single primary type, because that is what determines where it belongs and how the rest should be rewritten, and flag the others as candidates for extraction. Resist the urge to invent a fifth category for the awkward ones.

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
