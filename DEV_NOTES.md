# DEV Notes - Question Drill + Test Mode

## 1) Discovery (mandatory)

- Practice/Learning screen component:
  - `index.html` -> section `#practice-question` -> card `#question-drill` (sentence area + 3 category chips/buttons).
  - This is the screen from the screenshots.
- Routing:
  - No React/Next route here; this app uses tab-based SPA navigation in `js/app.js`.
  - Relevant functions: `setupTabNavigation`, `navigateTo`, `navigateToPracticePage`.
- UI stack:
  - Custom HTML + CSS (no MUI/Chakra/Tailwind for this screen).
  - Main styles are in `css/style.css` under `.question-drill-*`.
- Session/state + persistence:
  - Runtime state in `questionDrillState` (`js/app.js`).
  - Local storage keys:
    - `question_drill_prefs_v2` (mode/plan/difficulty)
    - `question_drill_prefs_v1` (legacy fallback)
    - `question_drill_test_stats_v1` (test stats history)
- Question bank/data source:
  - `QUESTION_DRILL_PACK` in `js/app.js`.
  - Answer prompt bank for learning mode: `QUESTION_DRILL_OPTION_BANK`.

## 2) How Test Mode was integrated

- Added shared test logic helper:
  - `js/question-drill-engine.js`
  - Exposes:
    - `normalizeDifficulty`
    - `selectItemsByDifficulty`
    - `clampReactionTimeMs`
    - `computeTestScoreDelta`
- Updated script load order in `index.html`:
  - `js/question-drill-engine.js` loads before `js/app.js`.
- Refactored `Question Drill` flow in `js/app.js`:
  - Replaced old internal `exam` handling with normalized `test` mode.
  - Added fast test round loop:
    - sentence display
    - big banner prompt: `מצא את ...!!`
    - 3 large answer buttons in test mode (הכללה / עיוות / מחיקה)
    - immediate feedback + auto-advance.
  - Added live timer, score, streak handling.
  - Added difficulty selection for MVP:
    - `easy`
    - `medium`
  - Deck selection now filters by difficulty in test mode.
  - Persisted:
    - last difficulty
    - best score per difficulty
    - last 10 test results
- UX cleanup:
  - Removed confusing local `1 ...` header area from question drill.
  - Added explicit top mode switch with `מוד מבחן`.
  - In test mode, redundant controls are hidden (category/hint/check) and flow is action-first.

## 3) Files changed

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/question-drill-engine.js` (new)
- `scripts/question-drill-engine.test.cjs` (new)

## 4) Run + verify

- Dev run:
  - `npm run dev`
- Checks used:
  - `node --check js/app.js`
  - `npm run test:ui-wiring`
  - `node --test scripts/question-drill-engine.test.cjs`

## 5) Hebrew/mojibake audit

- Ran a repository scan for mojibake/replacement-char patterns.
- Confirmed no `�` replacement characters in `js/`, `css/`, `src/`, `index.html`.
- Existing heuristics may still flag files with many Hebrew geresh characters (`׳`) as false positives; no actionable broken UTF-8 strings were found in the edited Question Drill flow.

---

# DEV Notes - Connected Bubbles (Sentence Calibration)

## Discovery / placement

- Module container:
  - `index.html` -> inside `#practice-wizard` added card: `#connected-bubbles-trainer`.
- Runtime integration:
  - `js/app.js` bootstrap now calls `setupConnectedBubblesTrainer();` next to other trainers.
- Styling stack:
  - Custom CSS in `css/style.css` with `cbcal-*` classes (mobile-first).
- Data source:
  - Local JSON: `data/connected-bubbles-cases.json`.
  - Runtime fallback: `cbcalFallbackCases()` in `js/app.js` if fetch fails.

## What was integrated

- New 3-stage flow:
  - Intro (10s countdown + skip)
  - Context (tap a key sentence; non-candidate -> `Try again`)
  - Connected Bubbles main screen
- Main screen features:
  - SVG bubbles (Inside/Outside/Spoken) with motion by match score.
  - Editable center sentence + chips in two rows (Inside / Outside).
  - Deterministic dual scoring:
    - `inside_match` + `outside_match` (0-100)
    - `Balanced` only when both are 70-85.
  - Undo stack for chip transforms.
  - Transcript drawer stays locked until balanced.
  - Bubble tap opens modal with full bullets.

## Files touched for this module

- `index.html`
- `css/style.css`
- `js/app.js`
- `data/connected-bubbles-cases.json` (new)

## Verification

- `node --check js/app.js`
- `npm run -s test:ui-wiring`
- `npm run -s test:mobile`

## Update: Minimal Hebrew Case Pack (CB-01..CB-08)

- Added case pack file:
  - `src/data/connectedBubblesCases.he.json`
- Synced runtime fetch file:
  - `data/connected-bubbles-cases.json`
- Loader now tries both URLs in order and falls back locally:
  - `src/data/connectedBubblesCases.he.json`
  - `data/connected-bubbles-cases.json`
  - `cbcalFallbackCases()`
- Parser supports both schemas:
  - full (`suggested_chips`, `transcript_template`)
  - minimal (`chips`, `transcript`, `target_balanced_sentence`)
- Candidate validation now follows string match against `candidate_sentences[].text`.
- Transcript highlight supports both styles:
  - `[[inside:...]]` / `[[outside:...]]`
  - `<inside>...</inside>` / `<outside>...</outside>`
- Balanced unlock now supports deterministic target matching:
  - exact or high similarity to `target_balanced_sentence`
  - still keeps legacy score-based balance as fallback.

---

# DEV Notes - Living Triples v2 (Stepper Refactor)

## Discovery

- Page: `living_triples_trainer.html` (standalone route).
- Runtime logic: `js/living-triples.js`.
- Data source: `data/living-triples.json`.
- Routing model: static standalone page linked from `index.html` (`living_triples_trainer.html`).
- UI stack: plain HTML/CSS/JS (custom, no React/Tailwind/MUI for this page).

## What was implemented

- Rebuilt module UX to strict 4-step flow:
  1. בחירת קטגוריה
  2. Reveal 0/3 -> 3/3
  3. שיקוף
  4. Insight + סיום
- Large table removed from default gameplay view.
- Added `מפת השלשות` modal/drawer, with sticky active row bar during play.
- Reveal stage now shows exactly 3 cards for active row only.
- Removed technical labels from user-facing UI (no `Unknown`, no `Follow-up`, no `Question Lock`).
- Added gentle `אני לא יודע` popover with exactly 2 follow-up options.
- Added wrong-row feedback during Reveal: short message + shake animation.
- Added auto transition to Reflection after 3/3.
- Added editable reflection (10-second window) and Insight card before `משפט הבא`.
- Kept local progress persistence in `localStorage` (`living_triples_progress_v2`).

## Data integration

- Replaced `data/living-triples.json` with clean UTF-8 Hebrew/English content.
- Schema used:
  - `triplesMap.rows`
  - `triplesMap.categoryToRow`
  - `triplesMap.labelsHe`
  - `scenarios[]` with `targetRow`, `sentence`, `answers`, `insight`
- Added fallback scenarios in JS so module still runs if fetch fails.

## Files changed

- `living_triples_trainer.html`
- `js/living-triples.js`
- `data/living-triples.json`
- `css/style.css`
- `DEV_NOTES.md`

## Update: Full Living Triples Pack (50 scenarios)

- Imported full JSON scenario pack provided by user into `data/living-triples.json`.
- Verified schema and load:
  - `version: 1.0.0`
  - `language: he`
  - `scenarios: 50`
  - rows distribution: `1:10, 2:10, 3:10, 4:10, 5:10`.

## Run / verify

- `npm run dev`
- `node --check js/living-triples.js`
- `node -e "JSON.parse(require('fs').readFileSync('data/living-triples.json','utf8')); console.log('living-triples.json OK')"`
