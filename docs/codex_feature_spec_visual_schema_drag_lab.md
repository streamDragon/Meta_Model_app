# Feature Spec for Codex

## Name
`Visual Schema Drag Lab` (Hebrew UI label: `מעבדת סכמות חזותית`)

## Product goal (one line)
Turn highlighted words/phrases/short text blocks from a client sentence (or paragraph) into **visual meta-model schemas** (cause-effect, complex equivalence, logical levels, time/context, VAK, etc.) to build **visual intuition**, first for **reveal**, then for **challenge**.

---

## Context (why this exists)

We already have:
- Iceberg Templates (good foundation, reveal-only)
- Classic Classic / Classic 2
- Triples Radar / Meta Radar

What is missing:
- richer **visual schemas / drawings** (not only cards/boxes)
- ability to drag **multiple items** (not one token only)
- ability to drag **short phrase blocks** (not just single words)
- ability to build a **space/map** (especially logical levels with parent/child/sibling relations)
- stronger “intuition training” through diagrams

This new module should feel like a **visual workshop**, not a quiz.

---

## Important constraints (non-negotiable)

1. **Training-only** (no live therapy mode)
2. **No runtime AI dependency** in MVP
3. **Local JSON driven content**
4. **Reveal first, challenge second**
5. **Original diagrams only** (do NOT trace exact copyrighted diagrams from books/workbooks)
   - You may use the *structural topology* (slot logic / relation types / flow)
   - But draw original SVG shapes and layout

---

## Sources / inspiration (for design direction, not copying)

- `https://expandyourworld.net/` (shape/icon-based conceptual teaching style)
- Dilts / Sleight of Mouth style diagrams (topology inspiration only)
- Existing app visual language in this repo (blue/teal/white, rounded panels, RTL)

Note:
- `PDFWorkbook.pdf` was referenced by the product owner but is **not present in the repo** right now.
- Build the feature so diagrams/content can be extended later when the PDF is added.

---

## Core concept

The user reads a text (sentence or short paragraph), selects one or more highlighted tokens/spans, and drags them into a **visual schema**.

The schema is not just “answer slots”:
- it has **spatial meaning** (before/after, cause/effect, parent/child, inside/outside, criteria ladder, etc.)
- drag placement teaches pattern structure visually

After filling enough of the schema:
1. system generates a **reveal summary**
2. then opens a **challenge layer** (questions that test the revealed structure)

---

## UX flow (single screen)

### A. Text board (`לוח משפטים`)
- Shows a sentence or short paragraph (not just one line)
- Contains highlighted draggable elements:
  - single words
  - short phrases (2–6 words)
  - optional mini-blocks (short clause)
- User can drag **multiple** different elements in one round

### B. Draggable source tray (`מאגר מילים/בלוקים`)
- Mirror list of detected/curated draggable spans from the text
- Each source item displayed as chip/card
- Supports multi-select + drag
- For mobile: tap item → tap target (fallback)

### C. Schema canvas (`בד ציור`)
- Center of the screen
- User chooses one schema from sidebar
- Schema renders as SVG/Canvas with named drop zones
- Zones accept compatible categories only
- Visual connectors appear when items placed

### D. Reveal panel (`חשיפה`)
- Auto summary of what was visually built
- “What this may mean structurally” (not truth claim)
- Shows filled slots and missing slots

### E. Challenge panel (`אתגור`)
- Opens after reveal threshold (e.g., 60–70% of required slots filled)
- Gives 2–3 challenge prompts per filled slot / relation
- Lets user choose what to challenge first (fact / meaning / criterion / timeline / sensory detail)

### F. Session controls
- `החלף סיפור`
- `סיפור לפי קטגוריה`
- `איפוס סכמה`
- `סכמה הבאה`
- `שמירה`
- `טעינה`

---

## Major new requirement: multi-drag and span blocks

### Must support
1. **Single token drag**
2. **Phrase drag** (short phrase block)
3. **Multiple items in the same schema**
4. **Paragraph-level text board** where several draggable spans coexist

### Data representation
A draggable unit is a `SpanToken`, not only a word:

```ts
type SpanToken = {
  id: string;
  text: string;
  start: number;
  end: number;
  kind: 'word' | 'phrase' | 'clause';
  categoryHints?: CategoryId[];      // optional
  semanticHints?: string[];          // e.g. ['respect', 'evidence-gap', 'time-marker']
  reusable?: boolean;                // default false
};
```

### UX behavior
- Each span can be used once by default
- Optional “clone mode” later (advanced)
- Used items become dimmed or locked in source tray

---

## Major new requirement: logical levels as a spatial structure (parent / child / sibling)

This is a core addition.

### Schema: `Logical Levels Tree`
Not just a ladder. It should support building **space**:
- each level can have:
  - parent relation (`אבא`)
  - child relation (`ילד`)
  - sibling relation (`אח`)

This allows the user to map statements like:
- “כבוד” (criterion / value)
- “רומסים את הכבוד” (meaning/identity/action jump)
- “בבית הזה” (context/time-space)
- behavior / evidence / rule / identity relations across levels

### Suggested slots (v1)
- `Environment` (`סביבה`)
- `Behavior` (`התנהגות`)
- `Capability/Strategy` (`יכולת/אסטרטגיה`)
- `Belief/Meaning/Rule` (`אמונה/משמעות/כלל`)
- `Identity` (`זהות`)
- `Value/Criterion` (`ערך/קריטריון`) — optional side rail

### Relation operations
- Drag item into level slot
- Connect slot-to-slot with relation chip:
  - `parent`
  - `child`
  - `sibling`
  - `supports`
  - `conflicts` (optional later)

---

## Schemas to implement (v1)

Build original SVG versions (clean, minimal, pedagogical). Do not copy exact book diagrams.

### 1) Cause-Effect / Complex Equivalence schema
Purpose:
- Distinguish **event**, **meaning**, **criterion/evidence**, and direction of inference

Visual:
- two main boxes + arrow(s)
- center switch label: `CE / CEq`
- optional evidence slot

Core drop zones:
- `Cause / Event`
- `Effect / Meaning`
- `Criterion / Evidence`
- `Alternative cause` (optional)

### 2) Logical Levels Tree (parent/child/sibling)
Purpose:
- Build hierarchical space from text
- Support “אבא / ילד / אח” relations

Visual:
- vertical stack + lateral sibling lanes + relation connectors

Core drop zones:
- `Environment`
- `Behavior`
- `Capability`
- `Belief/Meaning`
- `Identity`
- `Value/Criterion`

Relations:
- `parent / child / sibling`

### 3) Time / Context / Timeline schema (`CTX`)
Purpose:
- Organize time-space predicates and contextual boundaries

Visual:
- horizontal timeline + contextual tags above/below

Drop zones:
- `Before`
- `During`
- `After`
- `Place`
- `People`
- `Condition`
- `Exception`

### 4) VAK / Sensory predicates schema
Purpose:
- Ground abstract statements in sensory references

Visual:
- 4 boxes/radial cards:
  - `V`
  - `A`
  - `K`
  - `AD` (optional)

Drop zones:
- specific sensory words/phrases
- optionally “missing sensory evidence” marker

### 5) Criteria / Respect Gap schema (custom)
Purpose:
- Handle statements like “למה לרמוס את כל הכבוד של ההורים בבית הזה?”
- Make explicit the gap between:
  - label/criterion (“כבוד”)
  - actual observable facts

Visual:
- left panel: `Label / Value`
- center panel: `Definition / What counts as it`
- right panel: `Observed facts`
- bottom panel: `Gap / inference jump`

This schema is crucial for your “כבוד vs facts” example.

---

## Schema behavior (shared rules)

### Drop validation
- Each zone defines allowed category families (or semantic hints)
- If match:
  - green pulse
  - connect line appears
  - score + feedback
- If mismatch:
  - red X
  - short hint (`זה יותר מתאים ל־Criterion / CTX / VAK`)

### Slot completeness
- Schema may define:
  - required zones
  - optional zones
- Reveal unlock threshold:
  - default: 70% required zones filled

### Multi-item zones
Some zones must allow multiple drops (array):
- `Evidence`
- `Conditions`
- `Examples`
- `Sibling behaviors`
- `Timeline events`

---

## Reveal → Challenge two-phase logic (mandatory)

### Phase 1: Reveal (`חשיפה`)
Goal:
- organize the text visually
- make hidden structure visible

Outputs:
- summary sentence
- “what is filled / what is missing”
- map snapshot (JSON)

### Phase 2: Challenge (`אתגור`)
Goal:
- test the revealed structure, not attack the person

For each filled zone, generate 2–3 challenge prompts (from local templates).

Examples:
- Cause/Effect: `מה הראיה שהקשר הזה הכרחי? מה עוד יכול להסביר?`
- CEq: `איך בדיוק X אומר Y? לפי איזה קריטריון?`
- Criterion gap: `מה העובדות שנצפו בפועל? מה נחשב בעיניך כבוד?`
- CTX: `מתי זה נכון, ומתי לא? איפה זה קורה?`
- VAK: `מה ראית/שמעת/הרגשת בפועל?`

Challenge panel should let user choose path:
- `בדיקת עובדות`
- `בדיקת משמעות`
- `בדיקת קריטריון`
- `בדיקת תנאים/הקשר`

---

## Visual style (important)

### Direction
- Clean, intuitive, “learning lab”
- Blue / teal / white base palette (match existing app)
- High contrast drop zones
- Soft shadows, rounded cards
- Minimal clutter

### Diagrams
- Use **SVG** for crisp scalable diagrams
- Each schema is defined by:
  - SVG background shapes
  - positioned drop zones
  - optional connectors layer

### Mobile & desktop
- Desktop: sidebar + canvas + reveal/challenge panels
- Mobile:
  - schema canvas on top
  - source tray collapsible
  - tap-to-select source then tap target
  - no precise drag required

---

## Technical implementation (React + TypeScript)

### Main component
`MetaModelVisualSchemaBuilder.tsx`

### Suggested structure
```text
src/components/visual-schema/
  MetaModelVisualSchemaBuilder.tsx
  TextBoard.tsx
  SourceTray.tsx
  SchemaSidebar.tsx
  SchemaCanvas.tsx
  RevealPanel.tsx
  ChallengePanel.tsx
  SaveLoadControls.tsx

src/components/visual-schema/schemas/
  CauseEffectSchema.tsx
  ComplexEquivalenceSchema.tsx (or CE/CEq combined)
  LogicalLevelsTreeSchema.tsx
  TimelineContextSchema.tsx
  VAKSchema.tsx
  CriteriaGapSchema.tsx

src/components/visual-schema/engine/
  schemaTypes.ts
  schemaValidation.ts
  revealGenerator.ts
  challengeGenerator.ts
  tokenization.ts
  spanSelection.ts
  storage.ts

data/visual-schema/
  scenarios.he.json
  challengePrompts.he.json
  schemaDefinitions.he.json
```

---

## Data model (MVP)

### Scenario
```ts
type VisualSchemaScenario = {
  id: string;
  title: string;
  topicTags: string[]; // e.g. ['משפחה','כבוד','קריטריונים']
  text: string;        // sentence or short paragraph
  spans: SpanToken[];
  recommendedSchemas?: SchemaId[];
};
```

### Schema definition
```ts
type SchemaId =
  | 'cause_effect'
  | 'complex_equivalence'
  | 'logical_levels_tree'
  | 'timeline_context'
  | 'vak_map'
  | 'criteria_gap';

type DropZoneDef = {
  id: string;
  labelHe: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accepts: string[];       // category/family/semantic tags
  multi?: boolean;
  required?: boolean;
  role?: 'parent' | 'child' | 'sibling' | 'evidence' | 'context' | 'meaning' | 'fact';
};

type SchemaDefinition = {
  id: SchemaId;
  labelHe: string;
  shortCode: string;
  descriptionHe: string;
  svgPreset: string;       // identifies visual topology
  dropZones: DropZoneDef[];
  revealThreshold: number; // e.g. 0.7
};
```

### Session state
```ts
type Placement = {
  spanId: string;
  zoneId: string;
  schemaId: SchemaId;
  placedAt: number;
};

type VisualSchemaSession = {
  scenarioId: string;
  activeSchemaId: SchemaId;
  placements: Placement[];
  usedSpanIds: string[];
  phase: 'reveal' | 'challenge';
  revealSummary?: string;
  challengePath?: 'facts' | 'meaning' | 'criteria' | 'context';
};
```

---

## Specific requirements from product owner (must be implemented)

1. **Multiple drags from same text**
   - not only one word
   - multiple relevant items in same round

2. **Phrase/block drag**
   - support short block spans (clause-level)
   - drag should feel like moving a “meaning chunk”

3. **Logical levels parent/child/sibling**
   - build a space, not just a vertical list

4. **Visual intuition first**
   - diagrams/schemas are central, not secondary

5. **Sentence board like classic Structure of Magic**
   - the source text must remain visible and central

6. **Expanded categories beyond classic Meta Model**
   - include `CTX` (time/space/context predicates)
   - include `VAK` (sensory predicates)
   - include criteria/facts gap support (`כבוד`-type cases)

---

## “AI Suggest” button (MVP behavior)

Even if no LLM is used:
- implement `AI Suggest` as a heuristic recommender
- uses zone acceptance rules + category hints + semantic hints

Label in UI can stay:
- `AI Suggest` (optional)
- or Hebrew `הצעת מיקום`

Behavior:
- highlight 1–2 most likely target zones
- do not auto-place by default (unless user confirms)

---

## Reflection / reveal copy (Hebrew)

### Reveal disclaimer
`אילוסטרציה בלבד — לא אמת. זו דרך אחת לארגן את המידע ולחשוף מבנה אפשרי.`

### Reveal summary (generic)
`נבנתה מפה חזותית של המשפט: זוהו רכיבי משמעות/הקשר/קריטריון/עובדות. עכשיו אפשר לבדוק מה חסר ומה קפץ מהר מדי.`

### Challenge intro
`עכשיו מאתגרים את המבנה שנחשף — לא את האדם. בחר/י מה לבדוק קודם.`

---

## Example scenarios to ship in v1 (minimum 12)

Must include these topics:
- `כבוד` (criterion vs facts gap)
- `מנוחה`
- `תקשורת`
- `ביטחון`
- `מחויבות`
- `רומס אותי` (phrase block)
- `אני חייב`
- `אני לא יכול`
- `הוא לא רואה אותי`
- `הכול עליי`
- `אין לי אוויר`
- `בבית הזה` / context-heavy example (time/place/family context)

At least 3 scenarios should be paragraph-level (not just single sentence).

---

## Validation and QA

### Functional QA
- multi-drag works
- phrase drag works
- mobile tap fallback works
- invalid drop shows hint
- valid drop locks source item
- reveal unlocks at threshold
- challenge panel appears only after reveal
- save/load JSON roundtrip works

### Content QA
- no corrupted placeholders (`???`)
- all scenarios have spans
- all recommended schemas exist
- challenge prompts exist for all core zone roles

### Technical QA
- no runtime errors in standalone page
- RTL layout correct
- keyboard focus visible (desktop)

---

## Implementation note for Codex (important)

Do **not** try to deliver “perfect artwork” in v1.
Deliver a **clean, modular schema engine** with:
- original SVG shape primitives
- configurable drop zones
- multi-drag support
- reveal/challenge phase engine

Then visuals can be upgraded iteratively without rewriting logic.

---

## Concrete task prompt (copy-paste to Codex)

You are working in the Meta_Model_app repo.

Build a new standalone training module called **Visual Schema Drag Lab** (Hebrew UI: `מעבדת סכמות חזותית`) that lets the user drag multiple highlighted words/phrases/short clause blocks from a client sentence/paragraph into **visual meta-model schemas**.

### Mandatory goals
1. Multi-drag from the same text (not one token only)
2. Phrase/block drag support
3. Visual schemas (SVG-based) as central learning surface
4. Reveal-first, Challenge-second flow
5. Logical Levels schema with `parent / child / sibling` relation building
6. Include expanded categories like `CTX` (time/space/context) and `VAK` (sensory predicates)
7. Include a schema for criterion-vs-facts gap (e.g. “כבוד” vs observed facts)

### Implement in React + TypeScript
- Use a standalone host page + bundled JS (same pattern as `classic2_trainer.html` or `iceberg_templates_trainer.html`)
- No backend
- Local JSON scenarios only
- Mobile-friendly (tap source -> tap target fallback)

### V1 schemas to implement (original SVGs, not copied diagrams)
- Cause/Effect + Complex Equivalence schema
- Logical Levels Tree (with parent/child/sibling)
- Timeline / Context schema (`CTX`)
- VAK schema
- Criteria Gap schema (label/definition/facts/gap)

### UI layout
- Text board (`לוח משפטים`) with highlighted draggable spans
- Source tray (`מאגר מילים/בלוקים`)
- Schema sidebar (choose schema)
- Schema canvas (SVG + drop zones)
- Reveal panel
- Challenge panel
- Save/load controls

### State / engine requirements
- track placements, used spans, active schema, phase (`reveal|challenge`)
- validate drops by zone acceptance rules
- unlock challenge only after reveal threshold
- generate local reveal summary + local challenge prompts

### Files (suggested)
- `src/components/visual-schema/MetaModelVisualSchemaBuilder.tsx`
- `src/components/visual-schema/schemas/*.tsx`
- `src/components/visual-schema/engine/*.ts`
- `src/visual-schema-standalone.tsx`
- `scripts/build-visual-schema.mjs`
- `visual_schema_drag_lab.html`
- `data/visual-schema/scenarios.he.json`

### Quality bar
- clean UI
- RTL Hebrew
- no `???` corrupted text
- reusable schema engine (config-driven drop zones)
- working desktop + mobile fallback

### Copyright / design rule
Use **original schematic SVG diagrams** inspired by topology only.
Do not trace/copy exact diagrams from Dilts/workbooks.

---

## Effort estimate (for planning, not “minutes”)

- **MVP engine + 3 schemas + 8 scenarios**: Medium (M)
- **Full v1 (5 schemas + multi-drag + logical levels relations + reveal/challenge + save/load + 12 scenarios)**: Medium-Large (M/L)
- **Polished version with animation, export, AI-assisted suggestions, authoring tools**: Large (L)

