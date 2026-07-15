# Modes: two orthogonal axes

Shared by every pipeline skill. The mode word is one of `auto`, `semi-auto`, or `manual`. Evaluate these two decisions separately for every phase.

- **Questions axis** (is an agent's raised ambiguity surfaced?):
  - `auto`: never. Invoke the agent told to adopt its own recommended default and record the decision in the artifact, so it returns `done`. Nothing is written to `pendingQuestion`; nothing prompts.
  - `semi-auto` / `manual`: a `clarification-needed` return is surfaced inline via the "Raising a question" procedure.
- **Artifact-approval axis** (do you stop after a written/delivered artifact?):
  - `auto` / `semi-auto`: auto-approve every artifact; advance immediately.
  - `manual`: after each phase's artifact is written and read back, **summarise the deliverable (see "Summarising the deliverable at a manual gate")**, then use `AskUserQuestion` to approve or revise. `approve` advances via the transition script (into that phase's `*-awaiting-approval` gate then out to the real next status, matching the gate edges). `revise` re-runs that phase's agent with the feedback, re-writes the artifact in place, and asks again. The QA-gate `revise` routes the feedback plus the current `qa.md` to the **build** agent (not QA), re-runs QA, re-writes `qa.md`, and stays at the gate.

The axes are genuinely orthogonal: a phase artifact with no question in `semi-auto` still auto-approves; the same artifact in `manual` still stops for approval even though no question was raised.

## Summarising the deliverable at a manual gate

A `manual` gate asks you to approve or revise something you have not been shown. Before the approve/revise prompt, tell the human **what was just produced** and **where to read it in full**, so the decision is informed rather than blind. You already hold the material: at this point in the phase loop you have read the phase artifact back from disk (that read-back is a hard step, and it is what confirms the artifact exists and is non-empty), so summarise from the artifact you just read, never from the phase agent's return (its return is only `{"status": "done"}`; it carries no summary).

Do both of the following, in this order, every time a `manual` gate is about to prompt:

1. **Print a prose summary** just before the gate prompt: 2-5 lines capturing what this phase produced (for a spec: the scope and the shape of the solution; for a plan: the ordered steps at a glance; for an investigation: the root cause and the proposed regression test; for a build: what changed and how it was verified; for QA: the verdict and its one-line reasoning), followed by a **clickable link to the full artifact** (the calling skill names the exact link form for this phase, see "The link to the full deliverable"). This prose is the readable-in-foreground copy.
2. **Fold a condensed version into the gate question.** In the `AskUserQuestion` call itself, put a tightened form of the same summary (1-3 lines) **and** the same link into the `question` text. This is the copy that is *guaranteed to surface*: text printed before an `AskUserQuestion` call can be dropped in a background or resumed session (see the raising-questions reference), so the in-question copy is what ensures the human never approves without having seen the summary and the link. The prose in step 1 is a convenience on top of it, never the only carrier.

Because the summary and link live inside the question, this is a deliberate, named exception to the raising-questions "never print decision context as prose before the call" rule: the load-bearing summary is *in* the question (rule satisfied), and the prose copy is redundant reinforcement, not the sole channel. Keep the summary faithful to the artifact; never approve-gate a claim the artifact does not support, and never let the summary stand in for the human actually being able to open the full file.

### The link to the full deliverable

The gate summary must end with a link the human can open to read the whole artifact. The form depends on where the calling skill delivers:

- **File-delivery pipelines** (`/run-pipeline`, `/debug-pipeline`): the artifact lives on the local filesystem at the absolute path you just read back (`<root>/<issue>/spec.md`, `plan.md`, `investigation.md`, `build.md`, `qa.md`). Give that absolute path; in a terminal it renders as a clickable `file_path` the human can open.
- **GitHub-delivery pipeline** (`/run-pipeline-gh`): the artifact has just been delivered to GitHub, so link the delivered copy, not the disposable scratch file. For spec/plan, link the tagged issue comment (`gh issue comment` prints the new comment's URL to stdout on a fresh post; on a revise-in-place round where you do not have that URL, fall back to the issue URL, `gh issue view <issue> --json url --jq .url`). For build/QA, link the pull request whose body you just rebuilt (`gh pr view <pr> --json url --jq .url`). The scratch `<root>/<issue>/*.md` path is an internal output channel, not the human's read surface here.

The calling skill's gate handling points back here; it only needs to supply which of these link forms applies to the phase being gated.
