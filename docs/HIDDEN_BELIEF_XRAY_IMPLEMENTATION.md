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

## Optional semantic service (disabled by default)
- A same-origin serverless endpoint now exists at `/api/hidden-belief` with explicit client consent, no input persistence in app code, safety screening, JSON output verification, a single retry on malformed output, and a per-instance request brake.
- The endpoint stays unavailable unless `XRAY_SEMANTIC_ENABLED=true`, `XRAY_WAF_CONFIRMED=true`, a verified `AI_GATEWAY_MODEL` and server-side `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` are configured. The WAF flag must only be set after real edge rate limits and traffic protections have been verified; an in-memory function rate limit is insufficient on its own.
- Provider retention and logging policies apply when external processing is enabled. Never claim external processing has zero retention without verifying the provider and Gateway settings.
- The existing local-only option remains the default and continues to work without the endpoint.

## Not yet implemented or verified; do not misrepresent these as shipped
1. A real authenticated, budgeted and WAF-protected deployment of the semantic service; the optional API has been built and mock-tested but has not been enabled or exercised against a live model. Meaning-based grading of free-text exercises is also not implemented.
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
Verify a budgeted Gateway model, provider retention, privacy expectations and production WAF policy before activating semantic analysis. Perform a consented synthetic-only smoke test. Keep the local-only mode available independently. Gather consented expert feedback on the educational examples before treating any inference as accurate.
