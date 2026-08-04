# Explanation

**Explanation is discursive treatment of a subject that permits reflection.** It is understanding-oriented: it deepens and broadens the reader's grasp of a topic, bringing clarity, light, and context.

Read this before writing anything titled "About X", any concepts or background page, any design-rationale or architecture discussion, any ADR-style narrative.

## Reflection, and the wider view

Reflection happens *after* something else and depends on it, yet brings something new to it. That is the mode explanation works in.

Its perspective is higher and wider than the other three types. It does not take the reader's eye-level view like a how-to guide, nor the close-up view of the machinery like reference. Its scope is a *topic*: an area of knowledge, bounded in some reasonable and meaningful way.

For the reader, explanation joins things together. It answers "can you tell me about…?" It is the one kind of documentation it makes sense to read away from the product entirely.

## Why it matters, and why it gets skipped

Explanation is characterised by its distance from the practitioner's active concerns. It has no direct implication for what they do next, which is why it is often treated as less important. That is a mistake: it is less *urgent* than the other three, not less *important*, and it is not a luxury. Without it, a practitioner's knowledge of their craft stays loose, fragmented, and fragile, and their exercise of it is *anxious*.

Understanding does not *come from* explanation, but explanation weaves the web that holds everything else together.

In practice explanation is rarely recognised as its own thing. It gets scattered in small parcels through tutorials, how-to guides, and reference, where it damages its hosts and never develops properly itself.

## The boundary problem

Explanation is hard to start and harder to end. The other three types have their scope fixed by something external: what the reader must learn, the task to be achieved, the extent of the machinery. Explanation has no such limit, which gives the writer too many possibilities.

Two workable handles:

1. Use a real or imagined **why** question as the prompt, and let it define the shape.
2. Otherwise, draw lines around a reasonable area, and be satisfied with that.

It does not have to be called "Explanation". *Discussion*, *Background*, *Concepts*, *Conceptual guides*, and *Topics* all work.

## Key principles

### Make connections

You are weaving a web of understanding. Connect to other things, including things outside the immediate topic, when the connection helps.

### Provide context

Explain *why* things are as they are: design decisions, historical reasons, technical constraints. Draw out implications. Mention specific examples.

### Talk *about* the subject

Explanation is *about* its topic in the sense of being *around* it. The titles should reflect that: you should be able to put an implicit or explicit "about" in front of each one. *About user authentication*. *About database connection policies*.

Things worth discussing: the bigger picture, history, choices and alternatives and possibilities, reasons and justifications.

### Admit opinion and perspective

Opinion in documentation sounds wrong, but all human activity and knowledge is invested with belief and judgement, and the reality of anything humans built is rich with opinion. That has to be part of understanding it.

Any understanding also comes from a standpoint, which means other standpoints exist. **Explanation can and must consider alternatives**, counter-examples, and competing approaches. You are not instructing or stating facts here; you are opening the topic up for consideration. Think of it as discussion, which can weigh contrary opinions.

### Keep it closely bounded

Explanation absorbs things. Intent on covering the topic, the writer feels the urge to add instructions or technical description. Documentation already has places for those, and letting them creep in damages the explanation *and* removes them from where readers would look for them.

## The language of explanation

| Pattern | Why |
| --- | --- |
| "The reason for x is that historically, y…" | Explain |
| "W is better than z, because…" | Offer judgements, and opinions where appropriate |
| "An x in system y is analogous to a w in system z. However…" | Give context the reader can attach to what they know |
| "Some people prefer w (because z). That can be a good approach, but…" | Weigh alternatives honestly |
| "An x interacts with a y as follows…" | Unfold the internals, to show why something behaves as it does |

## Excluded from explanation

- Step-by-step instructions (link to the tutorial or how-to guide)
- Parameter tables and exhaustive listings (link to reference)
- Anything the reader needs *while* their hands are on the machinery

## Before calling it done

- Does the title read naturally with "about" in front of it?
- Does it answer a *why* a real reader would ask?
- Does it make connections beyond the immediate topic?
- Does it consider at least one alternative or counter-position?
- Have all instructions and listings been moved out and linked?
- Is its scope deliberately bounded, rather than trailing off?
- Would it make sense read away from the product entirely?

## Not reference

Both are theoretical rather than practical, and the slip usually happens when an example in reference gets developed into a story about *why*. The test is the reader's relation to the work: reference is consulted *during* work, explanation is read *away* from it. If you can imagine reading it in the bath, it is explanation.

---

Adapted from [Diátaxis](https://diataxis.fr) by Daniele Procida, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
