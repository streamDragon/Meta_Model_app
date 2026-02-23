# Codex Feature Gap Report: Classic Classic + Classic 2 + Prism Modes

Date: 2026-02-23
Project: `Meta_Model_app`

## Purpose

This report maps the current codebase against the requested specs for:

1. `Classic Classic` (Breen-anchored Meta Model trainer)
2. `Classic 2` (Structure of Magic story/tiles + next-step engine)
3. `Prism Lab` (legacy/existing logical-level prism workflow)
4. `Prism Research Mode` (new text-research prism workflow + AFAQ report)

It is written to prevent feature loss/confusion and to give Codex a codebase-specific implementation plan.

## Important: There Are Two Prism Features (Keep Both)

### A) `Prism Lab` (legacy, logical levels)

- Entry in main app tab/module: `prismlab`
- Main code: `js/app.js`
- Purpose: logical-level guided prism mapping, scoring, deep analysis, export JSON
- Signals in code:
  - `setupPrismModule()`
  - `validateMappingEntry(...)`
  - `renderPrismLevelsDeepAnalysis(...)`
  - `renderPrismResultCompact(...)`

This is not the same as the new text-research prism loop.

### B) `Prism Research Mode` (new text research drill)

- Standalone page: `prism_research_trainer.html`
- Core engine: `js/prism-research-core.js`
- UI app: `js/prism-research-app.js`
- Purpose: text research loop (select span -> category -> generated Q/A -> back/continue) + AFAQ report

Action: preserve both. Label them clearly in UI to avoid user confusion.

## Current Version / Deploy Reality (Do Not Ignore)

- Local metadata is newer than live GitHub Pages.
- Use `npm run check:live` to compare `version.json` + `index.html` metadata.
- Current symptom: app may be operational, but visible feature set can be stale in Google Sites because live build is older.

Required deployment sequence after changes:

1. `git add .`
2. `git commit -m "..."`
3. `git push origin main`
4. Wait for GitHub Pages
5. Run `npm run check:live` until no diff
6. Refresh Google Sites editor/preview

## Feature Status Matrix

### 1) Classic Classic (Breen-Table Anchored, Game + Exam Modes)

Status: `Implemented (MVP+)`, but not identical to the originally requested stack structure.

What exists now:

- Standalone entry page: `classic_classic_trainer.html`
- UI app: `js/classic-classic-app.js`
- Engine/state machine: `js/classic-classic-engine.js`
- Config: `js/classic-classic-config.js`
- Seeded RNG: `js/classic-classic-rng.js`
- Data: `data/metaModelPatterns.he.json` (15 patterns)
- Copy/help texts: `data/copy.he.json`
- Tests: `scripts/classic-classic-engine.test.cjs`

Spec coverage:

- `Learning` / `Exam` modes: yes
- Timer: yes
- Pause in learning only: yes
- Hint flow in learning: yes
- Question -> Problem -> Goal -> Summary loop: yes
- End session report (accuracy / weak patterns / families): yes
- Data-driven patterns JSON: yes
- 15 patterns in dataset: yes
- Question option generation (2 good + 3 traps): yes (engine + tests)
- Seeded RNG stability: yes (tested)

Known gaps / mismatches vs requested spec:

- UI is vanilla JS, not React+TS (`requested stack mismatch`, not a functional blocker)
- Breen table panel is simplified family-level highlighting (`DEL/DIS/GEN`) rather than full Michael Breen table coordinates
- No explicit "Show in Table" animation beyond current simplified highlighting
- No dedicated `/src/components/...` structure (because implementation is standalone JS)
- No Vitest (uses `node:test` instead)

Recommendation:

- Keep current engine (it is working and tested)
- Only refactor to React/TS if there is a strong reason
- Prioritize content/UI refinement and full Breen visual mapping over rewrites

### 2) Classic 2 (Structure of Magic – Story Tiles + Next Step Engine)

Status: `Implemented as React+TS single-file component and now wired to standalone page`

What exists now:

- React component: `src/components/Classic2Trainer.tsx`
- Standalone bootstrap: `src/classic2-standalone.tsx`
- Standalone host page: `classic2_trainer.html`
- Bundle: `js/classic2-trainer.bundle.js`
- Build script: `scripts/build-classic2.mjs`

Spec coverage (very high):

- React + TypeScript: yes
- Single page component `Classic2Trainer.tsx`: yes
- RTL support: yes
- Story tiles (clickable chunks, not free text selection): yes
- Category list (8 demo categories): yes
- Category-specific tile validation + hints: yes
- Correct/incorrect feedback + progress blocking: yes
- Question bank (3 good + 3 bad for demo categories): yes
- Generated therapist question + client answer: yes
- Recursive loop indicator: yes
- Next Step Action panel with 3 direction buttons: yes
- Mobile responsiveness: yes (responsive CSS)
- WebAudio success/fail beeps: yes
- "Philosophy copy" required by spec appears in UI: yes

Known gaps / mismatches vs requested spec:

- No unit tests yet for `Classic2Trainer` state machine
- `shuffle()` uses `Math.random` (not deterministic / no seeded RNG)
- Scenario and categories are embedded in component (not externalized data file yet)
- No persistence of session state
- No multi-scenario loader (only one demo scenario)
- No export/report layer (not required by the Classic 2 prompt, but useful later)

Recommendation:

- Do not rewrite this feature
- Next improvements should be:
  1. Extract scenario + category data to JSON/TS data module
  2. Add deterministic RNG (seeded) for stable tests
  3. Add tests for tile validation and step transitions

### 3) Prism Research Mode (New Prism Text Research Drill + AFAQ Report)

Status: `Implemented MVP+ (already close to requested spec)`

What exists now:

- Standalone page: `prism_research_trainer.html`
- Core engine: `js/prism-research-core.js`
- UI app: `js/prism-research-app.js`
- Tests: `scripts/prism-research-core.test.cjs`
- Categories loaded from `data/metaModelPatterns.he.json` (15 patterns)

Spec coverage:

- Base story input and demo loading: yes
- Span-like selection (token range with start/end offsets): yes
- 15 Breen categories as buttons: yes (loaded from pattern data)
- Category-specific generated question: yes
- Continuity answer generation producing new sentence: yes
- Two navigation actions after QA:
  - Back to Base: yes
  - Continue From Answer: yes
- Node/session storage model with `parentId` graph: yes
- Path log (research log): yes
- AFAQ report generation: yes
- AFAQ report sections:
  - Causal chains
  - Meaning chains
  - Evidence/Criteria
  - Conditions/Scope
  - Modal constraints
  - Generalizations
- Auto insights (2–3): yes
- Next step recommendation: yes
- Minimum nodes threshold for AFAQ button: yes
- localStorage persistence: yes
- Copy JSON / Markdown report: yes

Known gaps / mismatches vs requested spec:

- `branchRootId` exists in node schema but is not actively populated by app flow
- No visual graph/tree view (only path log list)
- No PDF export (optional in spec)
- Category IDs use real pattern IDs (good), not placeholder `CAT_01...CAT_15`
- Answer generator is template-based (MVP-appropriate), but content quality will need iterative tuning
- UI is standalone JS, not React/TS (functional but different from possible future stack standardization)

Recommendation:

- This feature should be considered "already built MVP"
- Next work is content quality and UX polish, not architecture replacement

### 4) Prism Lab (Legacy Logical-Levels Prism)

Status: `Implemented in main app`, separate concept from Prism Research Mode

What exists now:

- Prism library/cards inside main app
- Prism detail view + guided inputs
- Logical-level validation and scoring
- Result rendering (compact + detailed)
- JSON export of sessions

Known gap:

- User confusion due naming overlap with Prism Research Mode

Recommendation:

- Keep both features
- Rename UI labels consistently:
  - `Prism Lab · רמות לוגיות`
  - `Prism Research Mode · Text Research`
- Add a short description under each launcher button

## Data Audit Result (Meta Model Patterns)

Dataset file: `data/metaModelPatterns.he.json`

Audit result:

- Pattern count: `15` (passes requested list)
- All patterns satisfy minimum content constraints:
  - `goodQuestions >= 8`
  - `trapQuestions >= 8`
  - `problemOptions == 5` with exactly one correct
  - `goalOptions == 5` with exactly one correct
  - `examples >= 3`

This means content infrastructure for `Classic Classic` and `Prism Research` is not the bottleneck right now.

## What Is Actually Missing (Priority Order)

### Priority 0: Deploy sync (must do first)

Problem:

- Local feature set/version is newer than live.

Action:

- Commit + push current changes, then verify with `npm run check:live`.

### Priority 1: Prevent feature confusion (UX labels and navigation)

Problem:

- Users confuse `Prism Lab` (logical levels) with `Prism Research Mode` (text research drill).

Action:

- Keep both and disambiguate labels across launcher/menus/home.
- Add short one-line descriptions in feature launcher.

### Priority 2: Classic 2 hardening (tests + deterministic behavior)

Problem:

- `Classic2Trainer` works, but lacks tests and deterministic question order.

Action:

- Add seeded RNG helper
- Add tests for:
  - tile validation
  - blocked progression on bad question
  - next-step transitions

### Priority 3: Classic Classic UX/content polish (not architecture rewrite)

Problem:

- Core functionality exists, but user perception is "missing" due UI/deploy/content mismatches.

Action:

- Improve visual Breen table fidelity
- Add clearer labels/explanations in summary and end report
- Optional: add "Show in Table" animation

### Priority 4: Prism Research quality tuning

Problem:

- Core loop exists, but answer templates and insights may feel generic in some sessions.

Action:

- Improve category-specific templates
- Add better branch summaries in AFAQ report
- Optional graph visualization

## Codex Implementation Instructions (Codebase-Specific)

When implementing new work, do NOT rebuild features that already exist.

### Reuse existing modules first

- `Classic Classic`:
  - Reuse `js/classic-classic-engine.js` and `data/metaModelPatterns.he.json`
  - Treat engine tests as source of truth

- `Classic 2`:
  - Reuse `src/components/Classic2Trainer.tsx`
  - Extend with extracted data + tests
  - Keep `classic2_trainer.html` + `scripts/build-classic2.mjs`

- `Prism Research Mode`:
  - Reuse `js/prism-research-core.js` and `js/prism-research-app.js`
  - Extend report logic, not replace it

- `Prism Lab`:
  - Keep current `app.js` module behavior
  - Only relabel/refine UX

### Avoid these mistakes

- Do not merge `Prism Lab` and `Prism Research` into one feature
- Do not rename/remove standalone pages without updating launchers
- Do not rely on version number alone; compare `buildIso` and `gitCommit` via `npm run check:live`

## Recommended Next Sprint (Safe and High Value)

1. Push current local changes so live = local (`1.0.20+`)
2. Add `Classic 2` tests and seeded RNG
3. Add clearer launcher descriptions for Prism modes and Classics
4. Tune `Prism Research` answer templates + report insights
5. Improve `Classic Classic` Breen visualization fidelity (fuller table mapping)

## Quick Verification Checklist After Any Change

- `node scripts/test-ui-wiring.mjs`
- `node --test scripts/classic-classic-engine.test.cjs`
- `node --test scripts/prism-research-core.test.cjs`
- `npm run build:classic2`
- `npm run check:live` (after push)

