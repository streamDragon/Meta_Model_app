# Codex Feature Spec — Iceberg Templates (קצה קרחון / שלדי עומק)

Date: 2026-02-23  
Project: `Meta_Model_app`

## 0) Feature Name + Positioning

### Feature name (internal)
`Iceberg Templates`

### UI label (Hebrew)
`קצה קרחון` / `שלדי עומק`

### One-liner
User drags a highlighted word/phrase from a client sentence into a visual template (“shape/skeleton”), and the app reveals a possible deep-structure interpretation via:
- auto question
- auto-filled slots
- reflection sentence
- `מטופל אחר` variations (to show non-absoluteness)

## 1) Product Principles (Non-Negotiables)

1. `Training-only`
This is a drill/simulation tool, not live therapy.

2. `No runtime AI`
All content is pre-authored JSON. No API calls for generation.

3. `Reveal-only`
The module reveals possible deep structures. It does not challenge, reframe, or validate “truth”.

4. `Illustrative, not true`
Always show explicit disclaimer in UI:
`אילוסטרציה בלבד — לא אמת`

5. `Explicit draggable candidates only`
Not every word is draggable. Each scenario defines 1–2 draggable tokens/spans.

## 2) Why This Module Exists (Goal)

Classic Meta Model drills teach visible surface patterns.  
This module teaches that many emotionally loaded words/phrases are “iceberg tips” that imply hidden structures:
- criteria
- assumptions
- causal conditions

Goal:
- make hidden structure visible first
- train “word -> possible deep structure” mapping
- then handoff to another tool for questioning/challenging

## 3) Integration in This Codebase (Important)

This repo already has:
- `Classic Classic` (Breen trainer)
- `Classic 2` (story tiles + next-step engine)
- `Prism Lab` (logical levels)
- `Prism Research Mode` (text research + AFAQ report)

`Iceberg Templates` should be a **new standalone trainer**, not a replacement of any existing module.

### Recommended implementation style (match existing patterns)

Use the same pattern as `Classic 2`:
- React + TypeScript component
- standalone HTML host page
- esbuild bundle script

### Recommended files

- `src/components/IcebergTemplatesTrainer.tsx`
- `src/iceberg-templates-standalone.tsx`
- `iceberg_templates_trainer.html`
- `scripts/build-iceberg-templates.mjs`
- `js/iceberg-templates-trainer.bundle.js` (generated)
- `data/iceberg-templates-scenarios.he.json`
- `scripts/validate-iceberg-templates.mjs` (optional but strongly recommended)
- `scripts/iceberg-templates-data.test.cjs` (optional)

### Launcher integration (after feature works)

Add a launcher button in `index.html`:
- `קצה קרחון / שלדי עומק`

Do not rename/remove:
- `Prism Lab`
- `Prism Research Mode`

## 4) User Flow (Single Screen Loop)

### Screen: Template Drill

#### Area A — Scenario Text (Client sentence)
- Show one client sentence (or 1–2 short lines)
- Highlight draggable candidates (word/phrase spans)
- Only highlighted spans can be dragged

#### Area B — Template Gallery (Shapes)
- Show 3 template cards (v1)
- Each card is a drop zone

#### Area C — Active Template Output
After successful drop:
- show auto-generated question
- fill slots with current set
- show reflection sentence
- show `מטופל אחר / תשובה אחרת`
- show disclaimer `אילוסטרציה בלבד — לא אמת`

#### Area D — Completion / Progress
- `סיים סבב` / `הבא`
- Move to next scenario
- Reset active token/template state

## 5) v1 Templates (Shapes) — Start With 3 Only

Keep v1 intentionally small and stable.

### T1 — `CEQ` (Complex Equivalence / Criteria)

Visual:
- token at top
- 3 slots below

Semantics:
- `[TOKEN] = A + B + C`

Question pattern:
- `מה נחשב אצלך '[TOKEN]'? תן 2–3 דוגמאות/סימנים.`

Slots:
- 3

### T2 — `CAUSE` (Cause/Effect or Conditions)

Visual:
- Either `A + B -> TOKEN`
- Or `TOKEN -> A + B`

Modes (inside same template payload):
- `CAUSES_OF_TOKEN`
- `EFFECTS_OF_TOKEN`

Question patterns:
- Causes: `מה גורם/מאפשר לך '[TOKEN]'?`
- Effects: `מה '[TOKEN]' מאפשר לך?`

Slots:
- 2

### T3 — `ASSUMPTIONS1`

Visual:
- token at top
- 3 assumption slots below

Question pattern:
- `איזה דברים משתמעים/מונחים כאן כשאתה אומר '[TOKEN]'?`

Slots:
- 3

UI note:
- label as `אילוסטרציה`

## 6) Data Model (JSON) — Required

The feature must be content-driven.

### Scenario file
Create:
- `data/iceberg-templates-scenarios.he.json`

Top-level structure:
- `version`
- `language`
- `templatesMeta` (optional labels/descriptions)
- `scenarios[]`

### Scenario object schema (required fields)

```json
{
  "scenario_id": "S001",
  "language": "he",
  "client_text": "אני צריך את המנוחה שלי.",
  "draggables": [
    {
      "id": "tok_rest",
      "type": "word",
      "text": "מנוחה",
      "start": 10,
      "end": 14,
      "allowed_templates": ["CEQ", "CAUSE", "ASSUMPTIONS1"]
    }
  ],
  "template_payloads": {
    "tok_rest": {
      "CEQ": {
        "question": "מה נחשב אצלך 'מנוחה'? תן 2–3 דוגמאות/סימנים.",
        "sets": [
          ["שקט בבית", "אין דרישות ממני", "כוס קפה לבד"],
          ["סיימתי מטלות", "15 דקות בלי טלפון", "להיות לבד"]
        ],
        "reflection_template": "אז 'מנוחה' אצלך יכולה להיות = {0} + {1} + {2}. (אילוסטרציה בלבד.)"
      },
      "CAUSE": {
        "mode": "CAUSES_OF_TOKEN",
        "question": "מה גורם/מאפשר לך 'מנוחה'?",
        "sets": [
          ["כשיש שקט בבית", "כשסיימתי מטלות"],
          ["כשאני לבד", "כשאין הודעות נכנסות"]
        ],
        "reflection_template": "מבנה סיבתי אפשרי: {0} + {1} → מנוחה. (אילוסטרציה בלבד.)"
      },
      "ASSUMPTIONS1": {
        "question": "איזה דברים משתמעים כשאתה אומר 'מנוחה'?",
        "sets": [
          ["מנוחה לגיטימית", "בלי מנוחה אי אפשר לתפקד", "מותר להציב גבול כדי לנוח"],
          ["מנוחה = שקט נפשי", "צריך תנאים כדי לנוח", "אם אין תנאים—זו לא מנוחה"]
        ],
        "reflection_template": "יתכן שהמשפט נשען על הנחות כגון: {0}; {1}; {2}. (אילוסטרציה בלבד.)"
      }
    }
  }
}
```

### JSON content rules (must validate)

1. Every `draggable.id` must exist in `template_payloads`
2. Every `allowed_templates[]` entry must have payload content
3. `start/end` must point to exact substring in `client_text`
4. `sets` length >= 2 (recommended; required if `מטופל אחר` button shown)
5. Slot count must match template type:
   - `CEQ` => 3
   - `CAUSE` => 2
   - `ASSUMPTIONS1` => 3

## 7) UI Components to Build

### 7.1 `IcebergTemplatesTrainer.tsx` (main screen)
Responsibilities:
- load scenarios JSON
- manage scenario progression
- manage selected token/template/set index
- render child sections

### 7.2 `ScenarioTextCard`
Responsibilities:
- render `client_text`
- highlight draggable spans using `[start,end]`
- make spans draggable (desktop)
- support tap-select fallback (mobile)

### 7.3 `TemplateGallery`
Responsibilities:
- render 3 template cards
- accept drop / tap-apply
- validate allowed templates
- send success/fail events to parent

### 7.4 `TemplateCard`
Responsibilities:
- display template title + explanation
- drop zone visuals
- active state
- render slots (2 or 3)

### 7.5 `ActiveTemplatePanel` (or inline in card)
Responsibilities:
- show question
- show current slot fill set
- show reflection text
- `מטופל אחר`
- `אפס` (optional)
- disclaimer

### 7.6 `CompletionFooter`
Responsibilities:
- `סיים סבב` / `הבא`
- disabled until at least one successful drop
- recap text

## 8) Interaction Model (Desktop + Mobile)

### Desktop
- HTML5 drag-and-drop is acceptable
- Drag draggable token -> drop on template card

### Mobile (must support touch)
HTML5 DnD is unreliable on touch, so implement a fallback:

1. Tap token -> mark as selected
2. Tap template card -> apply token to template

This fallback must use the same validation logic as drag-drop.

### Recommendation
Implement a unified handler:
- `applyTokenToTemplate(tokenId, templateType)`

Then both desktop DnD and mobile tap flow call the same function.

## 9) State Model (Minimal and Stable)

Use local component state first (no global store required for v1).

```ts
type TemplateType = 'CEQ' | 'CAUSE' | 'ASSUMPTIONS1';

type ActiveMapping = {
  tokenId: string;
  templateType: TemplateType;
  setIndex: number;
};

type TrainerState = {
  currentScenarioIndex: number;
  selectedTokenId: string | null;        // for mobile tap fallback
  active: ActiveMapping | null;          // current successful mapping
  completedAtLeastOneDrop: boolean;
  feedback: { tone: 'info'|'success'|'error'; text: string } | null;
  seenVariants: Record<string, number>;  // key = scenario|token|template -> setIndex
};
```

### State rules

On successful drop/apply:
- set `active = {tokenId, templateType, setIndex: 0}`
- set `completedAtLeastOneDrop = true`

On `מטופל אחר`:
- cycle `setIndex = (setIndex + 1) % sets.length`
- persist in `seenVariants` for this active key

On `הבא`:
- move to next scenario
- reset `selectedTokenId`
- reset `active`
- reset `completedAtLeastOneDrop`

## 10) Validation / Error Behavior

### Allowed template validation
If token is dropped on template not listed in `allowed_templates`:
- reject
- show short feedback:
  - `לא מתאים לתבנית הזו בסבב הזה`
- optional shake/bounce animation

### Missing payload fallback
If template is allowed but payload missing:
- show error:
  - `תוכן חסר בקובץ התרגיל`
- log details to console for authors

### Reflection formatting validation
If `reflection_template` placeholders exceed set length:
- fallback safely (show slots joined by commas)
- log warning

## 11) Rendering Rules (Important UX Details)

### Intro copy (module header)
Use concise Hebrew copy:

`לפעמים מילה היא רק קצה-קרחון. כאן גוררים מילה/ביטוי לתוך “צורה” שמגלה מבנה עומק אפשרי. התשובות הן אילוסטרציה בלבד — לא אמת. אחרי שהמבנה גלוי, אפשר לבדוק/לערער בכלי אחר.`

### Template card microcopy
Each template card should show:
- title
- one-line explanation

Examples:
- `CEQ / קריטריונים: מה נחשב אצלך X?`
- `סיבתיות: מה גורם ל-X או מה X מאפשר?`
- `הנחות יסוד: מה משתמע מהמילה/הביטוי הזה?`

### Disclaimer (always visible in active output)
`אילוסטרציה בלבד — לא אמת. לחץ/י "מטופל אחר" כדי לראות וריאציות.`

### Completion recap
After `סיים סבב`:
- `היום חשפנו: [TOKEN] בתוך תבנית [TEMPLATE].`
- `זה Reveal-only. לערעור/בדיקה — במודול הבא.`

## 12) Content Pack v1 (Minimum)

Ship with 12 scenarios, each with 1–2 draggable tokens max.

Recommended topics:
- מנוחה
- תקשורת
- כבוד
- ביטחון
- מחויבות
- "רומס אותי" (phrase)
- "אני חייב"
- "אני לא יכול"
- "זה לא בסדר"
- "הוא לא רואה אותי"
- "אין לי אוויר"
- "הכול עליי"

## 13) File-by-File Implementation Tasks (Codex Checklist)

### A. Data
- Create `data/iceberg-templates-scenarios.he.json`
- Add 12 scenarios
- Keep content authored (no runtime generation)

### B. React entry + bundling
- Create `src/iceberg-templates-standalone.tsx`
- Mount `<IcebergTemplatesTrainer />`
- Create `scripts/build-iceberg-templates.mjs` using `esbuild`
- Generate `js/iceberg-templates-trainer.bundle.js`
- Create `iceberg_templates_trainer.html` host page with:
  - loading shell
  - version-aware cache busting (same pattern as `classic2_trainer.html`)
  - bundle loader

### C. Component implementation
- `src/components/IcebergTemplatesTrainer.tsx`
  - load JSON
  - scenario progression
  - active template output
  - feedback
- Implement desktop drag + mobile tap fallback

### D. Validation
- Optional but recommended: `scripts/validate-iceberg-templates.mjs`
  - check offsets
  - check payload existence
  - check slot counts
  - check min sets

### E. Launcher integration (after feature works)
- Add button in `index.html` to `iceberg_templates_trainer.html`
- Label clearly (Hebrew):
  - `קצה קרחון / שלדי עומק`

## 14) Testing Checklist (Manual + Lightweight Automated)

### Manual QA
1. Draggable spans highlight correctly
2. Desktop drag works
3. Mobile tap-select + tap-template works
4. Disallowed template shows feedback
5. Allowed template renders question + slots + reflection
6. `מטופל אחר` cycles sets
7. `סיים סבב` enabled only after successful drop
8. `הבא` resets state and loads next scenario

### Optional automated tests (recommended)
- JSON validator script exits non-zero on malformed scenario
- Reflection placeholder formatter test
- `applyTokenToTemplate` validation unit test
- Variant cycling logic test

## 15) Acceptance Criteria (Definition of Done)

Feature is done when:

1. User can open `iceberg_templates_trainer.html`
2. User can drag (desktop) or tap-select/tap-apply (mobile) a highlighted token to a template
3. App validates allowed/disallowed templates
4. App renders:
   - question
   - filled slots
   - reflection
   - disclaimer
5. `מטופל אחר` cycles alternative sets
6. `הבא` advances to next scenario and resets state
7. Module works fully offline with local JSON only

## 16) Do Not Build Yet (v2+ only)

Do not add these in v1:
- runtime AI generation
- truth scoring
- therapy challenge/reframe
- authoring UI
- PDF export
- spaced repetition
- graph/tree visualization

## 17) Effort Estimate (Not Minutes — Reliable Sizing)

I cannot give a trustworthy estimate in “minutes” because it depends on:
- whether drag/drop infrastructure is reused
- how polished the UI must be
- how much content (12 scenarios vs more)

Use sizing instead:

- `S`: 1 template + 3–5 scenarios + minimal UI
- `M`: 3 templates + 12 scenarios + mobile fallback + validation + recap (this is your current request)
- `L`: add authoring tools, analytics, spaced repetition, exports

Practical expectation for your current request (`M`):
- MVP functional build: several focused hours
- polished version (content QA + mobile UX + validator + launcher integration): about 1–2 workdays

## 18) Codex Execution Prompt (Copy/Paste Starter)

Use this prompt in Codex after sharing this file:

```text
Build a new standalone trainer feature for this repo called "Iceberg Templates" (Hebrew UI label: "קצה קרחון / שלדי עומק").

Requirements:
- React + TypeScript component
- standalone host page + esbuild bundle (same pattern as classic2_trainer.html)
- local JSON content only (no APIs)
- 3 templates in v1: CEQ, CAUSE, ASSUMPTIONS1
- draggable highlighted spans from client text
- mobile tap fallback (tap token then tap template)
- after valid drop: show question + slots + reflection + "מטופל אחר"
- "מטופל אחר" cycles pre-authored sets
- show disclaimer: "אילוסטרציה בלבד — לא אמת"
- "סיים סבב / הבא" advances scenario

Use data-driven scenarios from data/iceberg-templates-scenarios.he.json.
Add a small JSON validator script.
Do not modify/remove Prism Lab or Prism Research Mode.

Deliver:
- src/components/IcebergTemplatesTrainer.tsx
- src/iceberg-templates-standalone.tsx
- scripts/build-iceberg-templates.mjs
- iceberg_templates_trainer.html
- data/iceberg-templates-scenarios.he.json (12 starter scenarios)
- optional validator script + basic tests
```

