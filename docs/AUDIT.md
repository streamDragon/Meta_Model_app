# Meta Model Gym — Product & Architecture Audit

**Date:** 2026-06-11 · **Branch:** `codex/ui-redesign` · **Status:** Audit only — no code changed.

---

## 0. Reality check: the stack is NOT React/Vite

The request described "my React/Vite NLP Meta Model app". The actual repository is a
**vanilla HTML/CSS/JS static site with no build system**:

| File | Size | Role |
|---|---|---|
| [index.html](../index.html) | 537 lines | All 6 screens as `<section class="tab-content">` blocks |
| [js/app.js](../js/app.js) | 1,878 lines | All logic, one global-scope file |
| [css/style.css](../css/style.css) | ~2,400 lines | All styles, two overlapping "design generations" |
| [data/meta-model-violations.json](../data/meta-model-violations.json) | 478 lines | All content (categories, statements, packs, prisms) |
| [tests/](../tests/) | 4 files | `node:test` regex assertions against raw source text |

No `package.json`, no modules, no framework, no router. This changes the meaning of
"Phase 1 — stabilize architecture": the first decision is **whether to migrate to Vite**
(recommended, see §8) or refactor in place.

---

## 1. Route / page / component map

Navigation is hash-based tab switching (`#home`, `#categories`, …) implemented in
[app.js:140-321](../js/app.js#L140-L321). There are **three parallel navigation systems**:

1. **Top tab row** (`.tabs`, 6 buttons) — desktop primary nav.
2. **Bottom nav** (`.bottom-nav`, 5 buttons — `about` omitted) — mobile.
3. **Custom back/home/forward bar** (`.nav-actions`) — an in-app re-implementation of
   browser history (own 30-entry stack, `pushState` mirroring). Duplicates what the
   browser already does; adds state to keep in sync.

| Tab (`data-tab`) | Screen | JS owner |
|---|---|---|
| `home` | Welcome + CTA grid + Progress Hub (streak/XP/badges/sessions, level ring, next mission) | `initializeProgressHub`, `updateProgressHub` |
| `categories` | 3 accordion cards (deletion/distortion/generalization) with 11 subcategories, "practice this category" CTA | `populateCategories` |
| `practice` | Trainer Mode: 10-question MCQ with feedback, hints, XP, completion card | `setupTrainerMode`, `startTrainer`, … |
| `blueprint` | 4-step state machine (Capture → Specify wizard (8 Qs) → Expectation Gap → Final Plan), JSON export | `setupBlueprintBuilder`, … |
| `prismlab` | Prism library (6 cards) → detail with 5-level E/B/C/V/I accordion, emotion/resistance sliders → pivot recommendation + export | `setupPrismModule`, `openPrism`, `computePivotRecommendation` |
| `about` | Static info | — |

Cross-cutting: splash screen (1.9 s overlay), "opening music" via Web Audio on first
pointer/key event, loading indicator, hint toast box.

---

## 2. Data / content map

Everything lives in one monolithic JSON file:

| Key | Content | Notes |
|---|---|---|
| `categories` | 3 categories × 11 subcategories (name, Hebrew, description, example, corrective question) | The Meta Model core. Solid, but small. |
| `practice_statements` | **Only 10 statements** (deletion 3, distortion 4, generalization 3) | Trainer takes `slice(0,10)` in file order → every "10-question session" is the same questions in the same order. Category-filtered sessions have 3–4 questions. |
| `blueprint_builder` | State-machine doc + 5 `reframe_templates` (non-blame reframes) | Templates matched by hard-coded `gap_hint` strings in JS ([app.js:1222-1238](../js/app.js#L1222-L1238)) — fragile string coupling. |
| `choice_packs.prism_breen` | E/B/C/V/I levels × 3 choices each, each with a "cleanup question" | **Mislabeled as Michael Breen** — see §4.2. |
| `choice_packs.blueprint` | 12 fields × 3 choices | All Blueprint inputs are dropdowns (no free text by design — "no AI" product stance). |
| `prisms` | 6 prisms (cause_effect, comparisons, nominalization, modal_operators, universal_quantifiers, mind_reading) with rich fields: `linguistic_triggers`, `therapist_intent`, `anti_patterns`, `level_hints`, `recommended_interventions_by_level`, `examples`, `tags` | **Most of this richness is unused by the UI** — only `name_he/en`, `philosophy_core`, and `anchor_question_templates[0]` render. |

**Client-side state (localStorage, unversioned):**
- `userProgress` — `{xp, streak, badges[], sessions, lastSessionDate}`
- `prism_sessions` — last 10 prism sessions with recommendation

No schema version on either → future migrations will be painful. No saved Blueprints
(export-to-file only), no insight journal, no review queue.

---

## 3. Feature status: real / partial / duplicate / broken

### Real and working
- Tab navigation + hash routing + popstate handling.
- Categories accordion with practice CTA.
- Trainer Mode MCQ flow with instant feedback, hints, completion card.
- Blueprint 4-step wizard with live summary and JSON export.
- Prism Lab: library → detail → 5-level mapping → pivot heuristic → save/export.
- Progress Hub display (streak/XP/badges/sessions).

### Broken / buggy (do not hide — listed explicitly)
| # | Problem | Evidence |
|---|---|---|
| B1 | **XP economy is mostly dead.** `onBlueprintComplete()` (+20 XP) and `onPrismComplete()` (+15 XP) are defined but **never called** ([app.js:1686-1699](../js/app.js#L1686-L1699)). Only the MCQ trainer awards XP. The home screen promises "כל משימה = נקודות" — false for 2 of 3 labs. | grep: zero call sites |
| B2 | **Trainer sessions are deterministic.** Questions = `statements.slice(0, 10)` in JSON order, never shuffled ([app.js:726](../js/app.js#L726)). With 10 total statements, every full session is identical. | |
| B3 | **MCQ has only 3 options, comment claims 4 distractor logic.** Only category-level (3-way) discrimination is trained — the 11 subcategory patterns are never tested ([app.js:783-830](../js/app.js#L783-L830)). | |
| B4 | **"Do it now" 10-minute timer is a stub** — fires `alert()` with "Could implement actual timer here" comment ([app.js:1326-1329](../js/app.js#L1326)). | |
| B5 | **Level ring shows `xp % 100` as a percentage** — progress visually resets every 100 XP with no level number ([app.js:1849](../js/app.js#L1849)). | |
| B6 | Biased shuffle `sort(() => Math.random() - 0.5)` ([app.js:798](../js/app.js#L798)) — minor, but wrong. |
| B7 | `updateStreak()` only runs via `addXP`/`recordSession` — a fully-wrong-answers trainer session still records via `recordSession()`, but Blueprint/Prism sessions never do (consequence of B1). |

### Duplicate / dead code (~400 lines)
| # | Item | Status |
|---|---|---|
| D1 | `endTrainerSession`, `generateFinalBlueprint`, `renderPrismResult`, `updateProgressHub` are each **defined twice**; the second definition silently shadows the first (JS hoisting). The "polished" versions at [app.js:1701-1873](../js/app.js#L1701-L1873) win. | Delete first definitions |
| D2 | `populateCategoriesLegacy`, `setupTrainerModeLegacy` — explicitly named legacy copies, never called. | Delete |
| D3 | **Legacy free-practice feature is 100% dead**: `getNextStatement`, `showAnswer`, `showPracticeHint`, `hideAnswer` ([app.js:538-653](../js/app.js#L538-L653)) target DOM ids (`next-btn`, `show-answer-btn`, `practice-statement`, `practice-answer`, `practice-count`) that **do not exist in index.html**. | Delete or resurrect deliberately |
| D4 | Stray 2-byte file `index` at repo root. | Delete |
| D5 | ~40 review screenshots (PNG) + `.playwright-mcp/` logs committed at repo root. | Move to `/docs/screenshots` or gitignore |
| D6 | Arabic-script comment artifact at [app.js:1685](../js/app.js#L1685) (`اهوك XP acquisition على actions`) — copy/paste residue. | Delete |
| D7 | CSS contains **two design generations**: `:root` block (`--primary: #2f6f6d`, `.container` 1180px, old `header`) and `.app-shell` block (`--primary: #008f87`, 1160px, `.app-header`). Both load; specificity decides. | Consolidate into one token set |

### Misleading / placeholder
- README describes a much older app (no Blueprint/Prism/Trainer/gamification) and an
  outdated file list. Stale.
- Tests are **structure-lock tests**, not behavior tests: they regex-match the current
  markup (e.g., exactly 4 `feature-brief`s, "no `role=table`", accordion item count = 5).
  Any redesign will break all of them by design. They must be replaced, not "kept green".

---

## 4. Theory-family mapping

| Family | Present today | Assessment |
|---|---|---|
| **Meta Model core** (Bandler/Grinder) | `categories` (3×11), `practice_statements`, Trainer MCQ | Real but shallow: 10 statements, 3-way classification only. No "form the question yourself" rep, no surface-vs-deep-structure teaching moment. |
| **Breen / systemic matrix** | `choice_packs.prism_breen` + the Prism Lab "Michael Breen table" | ⚠️ **Mislabeled.** The E/B/C/V/I rows are **Dilts' logical levels**, not a Breen matrix. The repo contains **no 15-question structure and no Breen source material**. Per the no-invention rule: everything currently labeled "Breen" must be treated as **placeholder — needs source validation**, and either renamed (it is honestly a logical-levels scan) or backed by real Breen material supplied by the product owner. |
| **Prisms** | 6 prisms with rich metadata | Partial. The 6 prisms are really *Meta Model violation lenses*. Rich fields (`linguistic_triggers`, `anti_patterns`, `recommended_interventions_by_level`, `therapist_intent`) are 80% unused by the UI — this is the best ready-made fuel for a desktop "lens workbench". |
| **Logical levels** (Dilts) | Embedded inside Prism Lab as the E/B/C/V/I scan + pivot heuristic | Conflated with "Breen". Should become its own named concept in the registry; the pivot heuristic ("identity-heavy + high resistance → recommend lower-level small win") is a genuinely good systemic idea worth keeping and crediting correctly. |
| **Reframing** | Only `reframe_templates` (5 non-blame reframes) inside Blueprint step 3 | No context-reframing / meaning-reframing feature exists. Future feature family. |
| **Anchors / habits** | Streak, XP, badges, daily-mission text; per-prism "anchor question" | The habit loop exists but is broken by B1. No NLP anchoring feature proper. |
| **Emotional image / sensory** | Emotion (1–5) and resistance (1–5) sliders in Prism Lab | Minimal. Sliders feed the pivot heuristic; no sensory/submodality exercise exists. |
| **Values / criteria / conflict** | Only the `V` row choices in the prism pack | Nothing dedicated. This is the planned Phase 5 feature — greenfield. |
| **Overdurf / HNLP meta-pattern** | Absent | Faint structural echo: prism flow is Activate (pick prism) → map → recommend small-win pivot. Could inform the change-flow architecture of future labs. Placeholder only. |
| **Dashboard / navigation** | Home + Progress Hub + 3 nav systems | Works; over-engineered nav, under-powered dashboard (no per-skill progress, no history of saved work). |

---

## 5. Desktop / mobile capability mapping

Current state: **one stacked center-column layout for both**; desktop is mobile-scaled-up
(max-width 1180px card). The `@media (max-width: 768px)` blocks adapt grids to 1-col.
Nothing breaks on mobile today — but nothing uses desktop space either.

Proposed mapping (drives the registry's `desktopSupport`/`mobileSupport`):

| Feature | Desktop | Mobile | Notes |
|---|---|---|---|
| Home / dashboard | full | full | Different compositions, same data |
| Categories (theory browser) | full | full | Desktop: side-by-side theory map; mobile: accordion (current) |
| Trainer MCQ / drills | full | **full** | This *is* the mobile flagship — quick reps, flashcards |
| Blueprint Builder | full | partial | Wizard works on mobile; desktop should show all steps + live plan side-by-side |
| Prism Lab (library + quick scan) | full | partial | Mobile keeps accordion scan; desktop gets the full matrix workbench |
| Systemic matrix workbench (future, real multi-column matrix) | full | **none → fallback screen** | First consumer of the graceful fallback pattern |
| Values/criteria/conflict lab (Phase 5) | full | partial | Desktop: criteria hierarchy + conflict map; mobile: elicitation drills + review of saved hierarchies |
| Progress / review / saved insights | full | full | Mobile-first review surface |

**Mobile fallback screen pattern** (for `mobileSupport: none`): feature title, one line on
why it needs a wider workspace, what *can* be done on mobile (e.g., review saved results,
do the related drill), CTA "המשך במחשב" (+ optionally copy a deep link). One shared
component, driven by registry data — not hand-built per feature.

---

## 6. UI problems

1. **Narrow desktop.** Single 1180px white card centered on a flat gray page. On a 27"
   display, >50% of the screen is empty margin while content stacks vertically.
2. **Center-column density.** Every screen is one column; Prism Lab detail forces a
   `0.85fr 1.35fr 1fr` 3-col row *inside* the narrow card ([style.css:504](../css/style.css#L504)) — cramped at desktop, restructured at mobile.
3. **Two design generations fighting** (D7): two primary teals, two container widths, old
   `header` vs `.app-header`. The visual identity is literally inconsistent in code.
4. **Weak identity / not "gym + lab".** Emoji as iconography, default `Segoe UI` (no
   Hebrew-optimized webfont like Heebo/Rubik/Assistant), conservative teal-on-white that
   reads "government form", not "colorful playful cognitive gym".
5. **`alert()` used for errors, hints, and the fake timer** — breaks flow, feels broken.
6. **Three navigation systems** create hierarchy noise; the custom back/forward bar
   occupies prime space to duplicate browser buttons.
7. **RTL is declared but not first-class**: physical CSS properties (`border-right`,
   `border-left`) used inconsistently rather than logical properties; LTR strings
   ("Blueprint Builder") sit untreated inside RTL labels; numerals/mixed-direction text
   unmanaged.
8. **Splash + autoplay-style music**: 1.9s blocking overlay on every load; chime fires on
   first interaction with no setting to disable. Surprising audio is a trust cost.
9. **Hierarchy**: card-in-card-in-card nesting (`.card` > `.q-card` > boxes), ~40 ad-hoc
   `grid-template-columns` declarations, no spacing/typography scale.

---

## 7. Architecture problems

1. **No modules, no build.** One 1,878-line global-scope file; inline `onclick=""`
   handlers require global functions; duplicate definitions (D1) only "work" by hoisting
   order. No bundler → no code-splitting, no TS, no lint, no dependency hygiene.
2. **No feature registry.** Adding a feature requires touching ≥4 places: HTML section,
   top tabs, bottom nav, `NAVIGATION_LABELS`, home CTA grid. They already drifted
   (`about` missing from bottom nav).
3. **Inconsistent state.** Module-level mutable globals (`metaModelData`,
   `trainerState`, `blueprintData`, `navigationState`, `userProgress`) with mixed
   persistence (some localStorage, some not), no versioning, no single store.
4. **Hardcoded content in JS**: hint texts, MCQ labels, badge definitions, reframe
   `gap_hint` string-matching, `whoExpectsMap` — all bypass the JSON content layer the
   product claims as its differentiator ("content packs you can swap and sell").
5. **Mixed old/new pages**: legacy practice (dead DOM), `-Legacy` functions, two CSS
   generations, duplicated "polished" render functions — three visible strata of
   rewrites layered without cleanup.
6. **Tests lock the markup, not the behavior** — they will all fail under any redesign
   and provide no safety net for logic (the XP bug B1 is invisible to them).
7. **Repo hygiene**: 40 screenshots and playwright logs at root, stray `index` file,
   stale README.
8. **Naming integrity**: "Michael Breen" label on Dilts levels (see §4.2) — a content
   correctness problem, not just cosmetic.

---

## 8. Proposed target architecture

### 8.1 Stack decision (the one real fork in the road)

**Recommendation: migrate to Vite + TypeScript + React** (matches what the owner already
believes the app is, and the desktop 3-column workbenches + registry-driven UI will be
significantly cheaper in a component model). A defensible lighter alternative is Vite +
TS with no framework (current code is framework-free, and a straight port is faster).
Either way, **Vite + TS + ES modules is the floor**; the GitHub Pages deployment is
preserved via `vite build` → static output.

### 8.2 Single app shell

One shell component owning: RTL document direction, header, **one** navigation system
(desktop sidebar/top-rail + mobile bottom nav, both rendered from the registry), the
content outlet, toast/hint system (replacing `alert()`), and the progress store.
Custom back/forward bar is removed in favor of real browser history.

### 8.3 Feature registry (the spine)

```ts
type Support = 'full' | 'partial' | 'none';

interface FeatureDef {
  id: string;                 // 'trainer-mcq'
  title: string;              // 'אימון זיהוי מהיר'
  shortDescription: string;
  theoryFamily: 'meta-model' | 'logical-levels' | 'systemic-matrix'
              | 'prisms' | 'reframing' | 'anchors-habits'
              | 'sensory' | 'values-criteria' | 'dashboard';
  skillTrained: string;       // 'זיהוי דפוס מחיקה/עיוות/הכללה'
  difficulty: 1 | 2 | 3;
  desktopSupport: Support;
  mobileSupport: Support;     // 'none' → registry-driven fallback screen
  dataSource: string;         // 'packs/meta-model-core.json'
  route: string;              // '#/trainer'
  component: () => Promise<Component>;  // lazy
  status: 'production' | 'beta' | 'prototype' | 'broken';
  sourceValidation?: 'verified' | 'placeholder';  // NLP-source integrity flag
}
```

Registry drives: nav menus, home dashboard cards, mobile fallback screens, status badges
(beta/prototype visibly marked instead of hidden), and content-pack loading.

**Initial registry entries** (honest statuses): home/dashboard (production), categories
(production), trainer-mcq (production, bugs B2/B3), blueprint (production, B1/B4),
prism-lab (beta, B1, `sourceValidation: placeholder` for the Breen labeling),
logical-levels scan (extracted from prism lab, placeholder), values-criteria lab
(prototype, Phase 5), systemic-matrix workbench (prototype, desktop-only, placeholder).

### 8.4 Content model

Split the monolith into versioned packs: `packs/meta-model-core.json` (categories +
statements, target 60–100 statements with subcategory-level answers),
`packs/prisms.json`, `packs/logical-levels.json` (renamed from "breen", with
`source: "placeholder — needs validation"` field), `packs/blueprint.json`,
`packs/values-criteria.json` (new). Each pack: `{schemaVersion, id, name, locale: 'he',
source, items}`. localStorage state gets `schemaVersion` + migration shim.

### 8.5 Safety / language boundary

Current copy is mostly training-language ✅, but prism fields use **clinical vocabulary**
(`therapist_intent`, "מטופל" in `cause_effect.therapist_intent`). Rename to
`trainer_intent` / "המתאמן", and add a fixed product-boundary line to About + first-run:
training, reflection, practice, awareness, options, inquiry — no diagnosis, no cure
claims, not an emergency tool.

---

## 9. Phased implementation plan

**Phase 1 — Stabilize architecture & registry** *(no visual change)*
Scaffold Vite+TS; port app.js into modules; delete dead/duplicate code (D1–D6) — each
deletion listed above, nothing silently dropped; fix B1 (wire Blueprint/Prism XP), B2
(shuffle + sample), B6; introduce the registry and render the existing nav from it;
replace structure-lock tests with behavior tests (Vitest + a Playwright smoke);
repo hygiene (screenshots → docs/, gitignore .playwright-mcp, README rewrite).

**Phase 2 — Desktop UI redesign**
One design-token system (single palette, Hebrew webfont, spacing/type scale, logical
properties for RTL); app shell with desktop rail + wide workspace; 2+1/3-column layouts:
theory/context (right in RTL) · active exercise (center) · progress/history/prism panel;
upgrade Prism Lab into the desktop lens workbench using the unused prism metadata;
replace alert() with toasts/inline panels; splash → instant load, music → opt-in toggle.

**Phase 3 — Mobile capability & fallback system**
Registry-driven mobile nav (bottom bar); stacked-card mobile compositions for
full-support features; the shared "available on desktop" fallback screen for
`mobileSupport: none`; mobile quick-drill mode (flashcards, daily reps, review of saved
insights).

**Phase 4 — Content model cleanup**
Split JSON into packs (§8.4); rename "Breen" → logical-levels scan with
`sourceValidation: placeholder`; move hardcoded JS content (hints, badges, MCQ labels,
reframes) into packs; expand statements to 60+ with subcategory answers; clinical →
training vocabulary; localStorage versioning.

**Phase 5 — Values / Criteria / Conflict lab (new feature)**
Desktop-full: criteria elicitation → hierarchy builder (drag-rank) → conflict map
(two-values negotiation canvas, ecology check). Mobile-partial: elicitation drill +
review saved hierarchies; canvas → fallback screen. Registered as `beta` from day one.

**Phase 6 — QA & polish**
Playwright flows (desktop + mobile viewports) for every production feature; RTL audit;
keyboard/contrast accessibility pass; performance (lazy-load labs); content review of all
Hebrew copy against the safety boundary; status badges verified honest.

---

## 10. Explicit do-not-lose list

Features/behaviors that must survive refactoring (or be removed only by explicit owner
decision): trainer MCQ + hints + completion card · categories content (3×11) · blueprint
4-step flow + reframe templates + JSON export · prism library + 5-level scan + pivot
heuristic + session save/export (localStorage `prism_sessions`) · progress store
(`userProgress` — migrate, don't reset users' XP/streak/badges) · Hebrew copy throughout ·
"no AI / content packs" product stance. **Flagged for owner decision (not silently
deleted):** legacy free-practice code (dead), opening music, splash screen, custom
back/forward bar, alert-based 10-minute timer.

---

## 11. CBT/NLP expansion audit (2026-06-12)

### 11.1 Data model

The app already has a registry-first React structure and a pure progress module, so the
CBT/NLP work should be added as a feature module instead of changing global state shape.
The expansion needs its own typed sessions for thought maps, belief lenses, reality
experiments, activation actions, lessons, and practice items.

### 11.2 Content packs

Existing production learning content is pack-based. CBT content should follow the same
pattern with local JSON packs and explicit `sourceValidation: "placeholder"` until a
human source review upgrades the material. No clinical or source authority should be
implied by the copy.

### 11.3 Route registry

The app uses hash routes from `src/registry.ts`. The CBT lab belongs in the registry as
`beliefs-reality-lab`, with `status: "beta"`, `desktopSupport: "full"`, and
`mobileSupport: "partial"` because mobile should support short guided work, not force the
entire desktop workspace into one narrow screen.

### 11.4 Progress and localStorage

Legacy progress uses `userProgress` and must not be reset. CBT-specific saved work should
use separate keys for sessions, lesson progress, and practice progress, while XP rewards
can reuse the existing progress API.

### 11.5 Mobile support and fallback patterns

`MobileFallback` currently only appears for `mobileSupport: "none"`, so partial-support
features still need responsive UI. The CBT thought-map flow should use a one-card-at-a-time
mobile wizard; lessons, practice drills, activation, and simple experiments can remain
single-column responsive panels.

### 11.6 Safety and product boundary

The app is an educational training and self-reflection tool. CBT copy must avoid diagnosis,
treatment claims, or crisis handling promises. High-risk exposure ideas and crisis language
need a guardrail message and should not produce a behavioral experiment.

### 11.7 Test and build scripts

Available package scripts are `npm run test`, `npm run test:all`, `npm run build`, and
`npm run validate:michael-hall`. There is no lint script in `package.json`; verification
must use the available Vitest and production build scripts.

### 11.8 Implementation plan

Add `src/types/cbt.ts`, CBT content packs, a pure `cbtEngine`, `cbtSafety`, and
`cbtStorage`; then build `src/features/cbt` around small reusable views: Thought Map,
Thought Record, Belief Lens, Reality Experiment, Activation Builder, Lesson Cards, and
Practice Drills. Wire the feature into the registry, home page, About copy, progress
rewards, and tests. Keep mobile one-card-at-a-time for the Thought Map.

### 11.9 Build and test risks

The main risk is accidentally coupling the new beta lab to unrelated trainer changes in
the dirty working tree. Stage CBT files explicitly and avoid `git add .`. The other risk is
claiming source validation for CBT/NLP material that is still placeholder content.
