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
