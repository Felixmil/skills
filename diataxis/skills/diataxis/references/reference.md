# Reference

**Reference is technical description of the machinery and how to operate it.** It is information-oriented: propositional knowledge that a reader consults while *working*.

Read this before writing or reviewing API docs, parameter tables, configuration listings, schemas, CLI options, error catalogues, or any generated documentation.

## Description, and only description

Whereas tutorials and how-to guides are led by the needs of the reader, **reference is led by the product it describes**. Its only job is to describe, as succinctly as possible and in an orderly way.

Reference should be austere. One does not *read* it; one *consults* it. There should be no doubt or ambiguity in it, and it should be wholly authoritative, because readers come to it for truth and certainty: a firm platform to stand on while they work. That certainty is what gives them the confidence to do their work at all.

Reference is like a map. A map tells you what you need to know about the territory without going out to check the territory yourself, and it is neutral about your purpose: the same marine chart serves a navigator plotting a course and an investigating judge.

It can, and often must, describe how something works or the correct way to use it. What it must not do is show how to accomplish tasks.

## Key principles

### Describe and only describe

*Neutral description* is the key imperative, and it is genuinely hard, because neutral description is not a natural way to communicate. What comes naturally is to explain, instruct, discuss, and opine, and every one of those runs against what reference needs: accuracy, precision, completeness, clarity.

The temptation comes from description feeling too thin to be useful. It does feel that way, and the other things are genuinely needed, just not here. Link to the how-to guide, the explanation, the tutorial.

Style: austere and uncompromising; neutral, objective, factual; structured according to the structure of the machinery itself.

### Adopt standard patterns

**Reference is useful when it is consistent.** Standard patterns are what make reference usable at speed: the reader's job is to find the fact where they expected it to be, in the form they expected. Put it there.

There are many places in writing to display range and vocabulary. This is not one of them.

### Respect the structure of the machinery

**The structure of the documentation should mirror the structure of the product**, the way a map corresponds to its territory, so the reader can work through both at once. If a method belongs to a class that belongs to a module, the documentation should show that same relationship.

This does not mean forcing documentation into an unnatural shape. It means letting the logical and conceptual arrangement of the code make sense of the documentation. A useful side effect: mirroring the code makes gaps in coverage obvious.

### Provide examples

Examples illustrate without drifting into explaining or instructing. An example of a command's usage can convey it and its context far more compactly than prose. Keep them illustrative: the moment an example starts saying *why*, or *what if*, or how it came to be, it has become explanation and should move out.

### Generated reference

Where reference can be generated from the software it describes, that is a strong way to keep it faithful to the code. It is not, however, the whole of documentation, and treating auto-generated API docs as sufficient is a common and serious mistake: it covers one quadrant of four.

## The language of reference

| Pattern | Why |
| --- | --- |
| "The default configuration inherits Python's defaults. It is available as `django.utils.log.DEFAULT_LOGGING` and defined in `django/utils/log.py`." | State facts about the machinery and its behaviour |
| "Sub-commands are: a, b, c, d." | List commands, options, features, flags, limitations, error messages |
| "You must use a. You must not apply b unless c. Never d." | Give warnings where appropriate |

## Excluded from reference

- Instructions for accomplishing a task (link to the how-to guide)
- Rationale, history, design discussion (link to explanation)
- Teaching, onboarding, hand-holding
- Opinion, recommendation, marketing
- Examples that have grown into explanations

## Before calling it done

- Is every sentence a statement of fact about the machinery?
- Does the arrangement mirror the code's own structure?
- Is the format identical across comparable entries?
- Can a reader find a given fact where they would expect it?
- Have all *why* and *how to* passages been moved out and linked?
- Is coverage complete against the actual surface, and are the gaps mirroring exposed?

## Not explanation

Both hold theoretical rather than practical knowledge, so they slip into each other easily, usually when reference starts to get expansive around an example. The test: is this something the reader turns to *while working*, or something they need once they have stepped away and want to think? Reference serves the application of knowledge; explanation serves its acquisition.

Rules of thumb: if it is boring and unmemorable, it is reference. Lists and tables of things are reference. If you can imagine reading it in the bath, it is explanation.

---

Adapted from [Diátaxis](https://diataxis.fr) by Daniele Procida, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
