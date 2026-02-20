# Shadow Quantifier AI Stack

This document defines the AI stack for the SQHCEL Wizard with structured outputs.

## Goal

Train the user to bridge mismatch between a short sentence and an implicit rule (`shadow quantifier`) before challenge.

Flow:

`S -> Q -> H -> C -> E/L`

- `S`: sensation signal
- `Q`: shadow quantifier
- `H`: hypothesis mirror (ownership + quantifier + check)
- `C`: calibration/confirmation
- `E/L`: exception ladder + learning sentence

## Components

### 1) Case Builder

Creates one consistent `CaseSeed` for a session.

Inputs:

- `locale` (`he`/`en`)
- `topic` (`work`/`couples`/`anxiety`/`shame`/`parenting`/`faith`/`money`)
- `dialogue_lines[]` (4-6 lines)
- `final_sentence`
- `difficulty` (1-3)
- optional `teacher_goal`

Output schema:

- `docs/schemas/shadow-quantifier-case-seed.schema.json`

System prompt (copy/paste):

```text
You generate a CaseSeed for a Shadow Quantifier NLP drill.
Goal: train mismatch detection between short language and hidden rule.
Keep strict internal consistency between:
- hidden shadow quantifier
- hidden deep sentence
- intensity conditions
- small exception (5% less true)
No identifying details.
If locale=he, write Hebrew.
Return only valid JSON matching the schema.
```

### 2) Patient Simulator

Simulates patient replies for:

- `confirm` step (`yes` / `partial` / `no`)
- `exception` ladder (`5%` -> `1%` -> `conditions`)

Schemas:

- confirm: `docs/schemas/shadow-quantifier-patient-confirm.schema.json`
- exception: `docs/schemas/shadow-quantifier-patient-exception.schema.json`

System prompt (confirm):

```text
You are the patient voice defined by CaseSeed.
Respond briefly and consistently.
If therapist text includes ownership language + quantifier + explicit check question,
and is non-judgmental, bias toward "yes".
If it is interpretive/aggressive/mind-reading, bias toward "partial" or "no".
Return JSON only, matching schema.
```

System prompt (exception ladder):

```text
You are the patient voice defined by CaseSeed.
Answer only the requested ladder level:
1 = 5% less true
2 = 1% less true
3 = strongest conditions (when/where/with whom)
No advice. Keep response short.
Return JSON only, matching schema.
```

### 3) Evaluator

Checks process quality (not therapy quality):

- ownership present
- quantifier present
- check question present
- non-interpretive wording
- clarity

Schema:

- `docs/schemas/shadow-quantifier-evaluator.schema.json`

System prompt:

```text
You are an Evaluator for Shadow Quantifier training.
You score structure quality, not therapeutic truth.
Return one concise fix only.
Prefer fixes that restore:
ownership -> quantifier -> check-question.
Return JSON only, matching schema.
```

## Structured Output Notes

- Use Responses API with structured output (`text.format`) and strict JSON schema.
- Keep schemas strict (`additionalProperties: false`) for stable parsing.

## Seed Dialogues

Use:

- `data/sqhcel-dialogues.json`
- schema: `docs/schemas/sqhcel-dialogue-pack.schema.json`

The file includes 20 Hebrew dialogues with metadata:

- topic
- tags
- difficulty
- 4-6 lines
- final sentence
- suggested shadow quantifier
- suggested small exception
