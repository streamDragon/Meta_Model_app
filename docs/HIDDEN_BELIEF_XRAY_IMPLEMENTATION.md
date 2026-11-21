# Hidden Belief X-Ray: implementation status

**Route:** `/#hidden-belief-xray` inside the existing Meta Model Gym app; no additional app or Vercel project.

## Architecture decision
A dedicated internal React trainer is used because its task is different from the classic Meta Model single-sentence detector, Breen pattern-location game and scripted prism exercises. It is linked from the one feature registry and follows the same hash navigation and Hebrew RTL design.

## Existing code reviewed
- `breen_table_lab.html` launches the bundled legacy table game. Its compiled script is not a reusable TypeScript data API.
- `data/breen-triples.json` contains Breen row 2 examples, but not a verified seven-row taxonomy.
- `prism_lab_trainer.html`, `prism_research_trainer.html` and `scenario_trainer.html` use standalone bundles with authored exercise content.
- `src/features/prismlab/PrismLabPage.tsx` uses logical-level packs historically named Breen; the existing registry warns that this is not a verified Breen table.
- No current safe client-to-LLM service or structured-output endpoint was found in this repository's actively deployed React trainers. Do not submit patient text to a public model endpoint or embed an API key in frontend code.

## Delivered beta
- Local cue-based, **non-AI** inference produces up to three hypotheses with original supporting quotes, a missing-link sentence, a question to verify and an explicit body-check caution.
- English Moshe example and a Hebrew equivalent are covered by automated tests.
- Modes: transcript reading and practitioner reflection (`what did I ask?` / `why?`).
- Status controls are in-memory only; no text, rating, or notes are written to browser storage, telemetry, or network requests.
- Risk-keyword screening stops the analysis when triggered. It is not a comprehensive risk assessment.
- Hebrew-first responsive UI.

## Not yet implemented; do not misrepresent these as shipped
1. General semantic detection, LLM JSON validation/retry, and meaning-based grading of free-text exercises.
2. A verified, canonical full Breen 1-7 taxonomy in importable source form; current row mapping is explicitly provisional.
3. Grounded interpretation of optional nonverbal notes, goal and contextual information.
4. Advanced clinical safety triage beyond a small set of high-signal phrases.
5. Human validation of plausible but unconfirmed hypotheses or clinical efficacy.

## Owner decisions still open
- Names of five categories in Hebrew, particularly `fused`.
- Who should see Breen row numbers by default; currently hidden behind an explicit reveal.
- Availability to non-practitioner users; the existing beta nav currently exposes the page within the lab group.
- Which fully fictional or explicitly approved anonymized cases to add; no real client transcripts may be committed.

## Before expanding
Implement a server-mediated, audited inference service with consent, no raw-transcript persistence, abuse protection, schema validation, and documented retention/deletion semantics. Keep the local-only mode available independently. Gather consented expert feedback on the educational examples before treating any inference as accurate.
