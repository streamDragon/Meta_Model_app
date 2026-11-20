# FEATURE SPEC FOR THE CODER AGENT: Hidden Belief X-Ray

> **To the coding agent:** this is a build request from Haggai (product owner) for this app (Meta Model Gym, companion to the book "מעבר למילים" / Beyond Words).
> Written by Claude on 2026-11-21 from a live role-play session with Haggai. A copy is in the claude.ai Project as `claude/META-MODEL-APP-feature-spec-hidden-belief-xray-2026-11-21.md`.
> **Status:** approved direction, details open. Read the whole file, then read the existing code (section 0) before you design anything.

---

## 0. Before you code: look at what already exists

This repo already has several trainers that this feature should fit next to and reuse:
- `breen_table_lab.html` (Breen table: reuse its row definitions and labels, don't invent new ones)
- `prism_lab_trainer.html`, `prism_research_trainer.html`
- `scenario_trainer.html`, `living_triples_trainer.html`, `sentence_morpher_trainer.html`, `iceberg_templates_trainer.html`
- `src/`, `js/`, `data/`, `packs/` (shared logic, data packs)
- `docs/FEATURE_PURPOSE_AUDIT.md` (feature purposes, so you can check this one doesn't duplicate an existing one)

Tasks for you before you build:
1. Find any existing sentence-level Meta Model pattern detector or taxonomy and **reuse** its pattern names.
2. Find how other trainers call the LLM (if any), and follow the same pattern, key handling, and Hebrew/RTL UI conventions.
3. Decide: new trainer page (e.g. `hidden_belief_xray.html`) or a mode inside an existing trainer. Write your decision and the reason at the top of your PR/commit.

---

## 1. Why this feature exists

In a role-play, Haggai (the therapist) asked the fictional client "Moshe": *"What do you think of yourself? Why does his opinion matter so much?"* It was the right question. Afterwards Haggai said: **"I felt it and asked it, but I couldn't name what was hiding there."**

What was hiding was a complex equivalence: **"my father's approval = my worth."** The client never said it. It lived in the **gap between two statements**:
- "I think I'm an okay father." (calm)
- "When Abba criticizes me at night, I shout at the kids and hate myself." (strong reaction)

If he really believed the first sentence, the reaction in the second would make no sense. The missing belief that **makes the behavior logical** is the hidden equation.

The feature makes these hidden beliefs visible, so that a practitioner can see the structure behind an intuitive move, and a learner can practise finding them. It is for **learning and supervision**, not for running the session.

## 2. Core principle (Haggai's method)

**"Creating logic":** every reaction is logical from inside some map. If a reaction looks illogical, there is a hidden or fused belief that makes it logical. Find the sentence that would make it make sense. (Related outside source: Ecker & Hulley, Coherence Therapy, "symptom coherence".)

**Hypothesis, not diagnosis:** Haggai offers a representation gently and checks the body. The app must do the same. Every output is a hypothesis to test, never a verdict about the client.

## 3. What to detect

| Type (code key) | Hebrew label (suggested, confirm with Haggai) | Signs | Moshe example |
|---|---|---|---|
| `limiting` | אמונה מגבילה | can't, never, impossible, must; modal operators; universal quantifiers | "Just once he'd see me." |
| `fused` | אמונה מעורבבת | someone else's voice/standard treated as one's own; lost performative; switching between "he" and "I" | "When Abba says something, what I think stops counting. As if his voice is the real one." |
| `hidden_equation` | משוואה נסתרת | X = Y never said out loud; a reaction too big for the event | approval = worth |
| `hidden_cause` | סיבה נסתרת | X makes me Y; "after he calls, I…" | "His call makes me shout." |
| `presupposition` | הנחת יסוד | what must be true for the sentence to make sense | "just once" presupposes "never" |

Treat **`fused`** as a central category. In Haggai's model, parts sit at row 1 of the Breen table as **two performers / two speakers**, and his work is "separate in order to connect".

## 4. Where to look: across statements, not only inside one

1. Stated belief vs reaction intensity ("I'm okay" + "I hate myself when he criticizes").
2. Stated value vs reported behavior ("model for my kids" + "I shout at them").
3. Reaction too big for the trigger (phone call → shouting + self-hatred).
4. Voice shifts: another person's words or standards spoken as facts.
5. Body/state notes, if the user enters them ("shoulders came up", "eyes got wet"). Optional input.

## 5. Inputs

- **Transcript mode:** paste client statements or a transcript (Hebrew primary, English supported).
- **Notes mode:** the practitioner's notes, including nonverbal observations.
- **Training mode:** see section 8.
- Optional fields: the client's goal (TOTE desired state), nonverbal notes, a context flag (religious / couple / family).

## 6. Output schema (one object per hypothesis, max 3, ranked)

```json
{
  "hidden_belief": "My father's approval decides my worth.",
  "missing_link_sentence": "Because Abba's criticism means I'm a bad father, I shout and hate myself.",
  "type": "hidden_equation",
  "evidence": [
    {"quote": "I think I'm an okay father.", "role": "stated_belief"},
    {"quote": "I shout at the kids and hate myself.", "role": "reaction"}
  ],
  "mismatch": "stated_belief_vs_reaction_intensity",
  "breen_row": 1,
  "question_to_surface_it": "Does his approval decide your worth, or does yours?",
  "alternative_questions": [
    "If he saw you that way, what would change: his attitude, or who you are?",
    "Whose voice is that, his or yours?"
  ],
  "body_check_prompt": "Say the missing-link sentence back to the client and watch for recognition: breath, shoulders, eyes, silence.",
  "confidence": "medium",
  "confidence_reason": "Two clear statements in tension; no body data.",
  "status": "hypothesis"
}
```

- `type`: one of `limiting | fused | hidden_equation | hidden_cause | presupposition`
- `mismatch`: one of `stated_belief_vs_reaction_intensity | value_vs_behavior | reaction_too_big | voice_shift | within_sentence`
- `breen_row`: 1-7 or `null` if not confident. Don't force it.
- `status`: always `hypothesis` until the user marks it `confirmed | rejected | unsure`.

The **missing-link sentence** is the heart of the feature. Template: **"Because ___ means ___, I feel/do ___."**

**Max 3 hypotheses.** Too many directions = no clear outcome (a principle from the same session).

## 7. Breen table mapping (working version, confirm with Haggai)

Use the row definitions already in `breen_table_lab.html` / data packs. Working mapping:
- **Row 1:** presuppositions, values, parts / two performers → `fused`, hidden values
- **Row 2:** modal operators, universal quantifiers → `limiting`
- **Row 3:** cause-effect, complex equivalence, mind reading → `hidden_equation`, `hidden_cause`
- **Row 4:** narrowing to context (identity → area): "never" → "never about my parenting"
- **Rows 6-7 (Haggai's additions):** the actual nonverbal representation / the wider inner world. Only when the user supplies representation data. Never project inner content onto the client.

## 8. Training mode

Learner enters: (1) what the client said, (2) the question they asked, (3) why ("I felt something about his father").
App shows: the hidden structure the question was aimed at (missing-link sentence), its type and row, whether the question went to the core or around it, and at most one sharper question.
Tone: acknowledge the intuition first ("your question was aimed at X"), then add the structure. Never "wrong answer".
Exercises: short vignettes with a belief hidden between two statements; the learner writes the missing-link sentence; compare **meaning, not wording** (LLM judge).

## 9. Implementation notes

- LLM call with **structured output** matching section 6. Validate the JSON; on failure retry once, then show a plain-text fallback.
- **Few-shot examples stored as data** (e.g. under `data/` or `packs/`), not hard-coded, so Haggai can add his own cases. Seed with the Moshe case (section 11).
- Hebrew-first UI, RTL, labels from section 3.
- Keep the prompt focused on **mismatch detection + missing-link sentence**. No general psychoanalysis.
- Each hypothesis card has buttons: confirmed / rejected / unsure. Store locally; this is the feedback signal for improving examples.
- Follow the repo's existing build (Vite + TS in `src/`, deploy via Vercel) and testing conventions.

## 10. Safety and ethics (required, not optional)

- Every card says **"hypothesis"**. Wording like "a possible hidden belief…", never "the client believes…".
- **No clinical labels** (disorders, attachment styles, personality types).
- **Body check is always part of the output.**
- **Sensitive contexts** (religious, e.g. honoring parents / kibbud av; couples; family): suggested questions should support both values ("honor your father *and* the father in you"), not set the client against a value or a person.
- **Privacy:** transcripts may contain patient data. No logging or analytics of input text, no storage by default, a clear delete option. Never put real client material into the example data or any public repo.
- **Scope:** for practitioners and learners, not self-diagnosis. If input suggests risk (self-harm, violence), skip the analysis and show a short note to seek professional or emergency help.

## 11. Acceptance test: the Moshe case

Input:
1. "My father calls every night and criticizes how I raise my kids."
2. "After the call I shout at the kids and hate myself."
3. "I think I'm an okay father. Most days."
4. "When Abba says something, it's like what I think stops counting. As if his voice is the real one."
5. "Just once I wish he'd see me."

Expected (any order, max 3):
- `hidden_equation`: approval = worth. Missing link like "Because Abba's criticism means I'm a bad father, I shout and hate myself." Evidence: 3 vs 2.
- `fused`: his voice taken as the real one. Evidence: 4. Question like "Whose voice is that, his or yours?" Row 1.
- `limiting` / `presupposition`: "just once" presupposes "never"; a counterexample exists (he once praised the degree). Narrowing at row 4: "never about my parenting".

**Fail** if: any clinical label, a belief stated as fact, more than 3 hypotheses, or no body-check prompt.

Add this as an automated test (mock or recorded LLM response for the schema/format checks; a separate optional live test for content).

## 12. Open questions for Haggai (ask, don't decide in code)

1. Hebrew names for the categories, especially `fused`.
2. Show the Breen row to all users, or only in training mode?
3. Should the free (non-practitioner) version have this feature?
4. Which of his own cases may be used as examples, anonymised?

## 13. Definition of done

- Feature reachable from the app's main navigation.
- Transcript mode + training mode working in Hebrew.
- Moshe acceptance test passing.
- Safety rules in section 10 visible in the UI.
- A short note added to `docs/FEATURE_PURPOSE_AUDIT.md` describing the feature's purpose.
