# Course Door Design

## Goal
Add a clear first decision at the app entrance: **"אני חדש" / "אני תלמיד בקורס"**. The public/new-user path keeps the current plain-language experience. The course path exposes a structured course navigator without deleting, renaming, or surfacing the underlying training tools as the primary information architecture.

## Product principle
The app serves two audiences through the same training engines:

- **New user:** enters through needs and plain language; no NLP knowledge assumed.
- **Course student:** enters through course → section → relevant practice.

The tools remain implementation engines. Users should not have to understand names such as Sentence Morpher, Verb Unzip, Living Triples, Prism Lab, or legacy tool names in order to train.

## Pass 1 scope
This pass adds only the **course door and course navigator**. It does not reorganize every existing feature, rewrite the trainer, add Milton practice engines, delete legacy tools, or change course content.

### Home entrance
At the top of Home, before the existing public-facing content, render two large choices:

1. **אני חדש** — continues into the existing Home experience on the same page.
2. **אני תלמיד בקורס** — opens a course selection panel.

The public Home copy and existing CTAs remain available below the chooser.

### Course selection
Pass 1 shows two course cards:

- **מטה-מודל** — links to the existing Categories / Trainer surfaces.
- **שפת ההשפעה** — opens the five-section course map below.

### Shfat HaHashpaa course map
Use the verified five-part structure from the course companion:

1. היפוך המטה-מודל
2. עמימות, קשב ויחסים
3. בניית משפטי השפעה
4. העמקה ומטאפורות
5. הנחות יסוד בשפה

Each section is a calm course card with a one-line description. In Pass 1, only routes that are already safe and verified should be actionable:

- Part 1 → Categories and Trainer entry points (Meta Model foundation / recognition practice).
- Parts 2–5 remain visible as course structure but are marked **"אימונים ייעודיים יתחברו כאן"** until existing engines are validated/mapped. Do not invent mappings just to make every card clickable.

### Navigation behavior
- Course selection is a Home subview, not a new global top-level feature.
- A back control returns from course map → course selection → entrance chooser.
- Existing side rail, bottom nav, registry, and feature routes remain unchanged in Pass 1.
- No existing feature is deleted or hidden.

### Visual direction
- Two primary entrance cards are large, simple, and visually dominant.
- Course UI is calmer than the current toolbox-style home: fewer emojis, stronger typographic hierarchy, obvious top-to-bottom reading flow in RTL.
- Preserve the app's existing design tokens where possible; add scoped Home/course-door styles only.

## Success criteria
1. A first-time visitor can choose "אני חדש" and continue using the current public Home without learning NLP terminology.
2. A course student can choose "אני תלמיד בקורס" → "שפת ההשפעה" and see the five-part course map in the correct order.
3. A Meta Model course student can reach Categories or Trainer from the course door.
4. Existing global navigation and existing feature routes still work.
5. No legacy tool, beta lab, Michael Hall, CBT, Prism, Values, or other research feature is deleted or reclassified in this pass.
