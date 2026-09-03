# Course Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-door Home entrance (new user / course student) and a course-student navigator with Meta Model and Shfat HaHashpaa course structure.

**Architecture:** Keep all existing features and global navigation intact. Add the decision tree as local Home state in `HomePage.tsx`, with a small data model for courses/sections and scoped CSS. Course links call the existing hash navigation routes; unvalidated Shfat HaHashpaa section mappings remain visible but intentionally non-clickable.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest 3, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-09-02-course-door-design.md`

## Global Constraints
- Work only on `ai/course-aligned-navigation-pass-2`, never `main`.
- Do not delete, rename, or hide existing features or legacy tools.
- Do not invent training-engine mappings for Shfat HaHashpaa parts 2–5.
- Keep the existing plain-language public Home intact below the chooser.
- Preserve RTL-first behavior and existing design tokens.

---

### Task 1: Add failing Home flow tests

**Files:**
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: existing `<App />` and hash routing.
- Produces: behavioral assertions for the two-door decision tree and course map.

- [ ] **Step 1: Add a test for the entrance chooser**

Add a test that renders `<App />` at `#home`, asserts both `אני חדש` and `אני תלמיד בקורס` are visible, clicks `אני תלמיד בקורס`, and then asserts `מטה-מודל` and `שפת ההשפעה` are visible.

- [ ] **Step 2: Add a test for the Shfat HaHashpaa five-part map**

Click `שפת ההשפעה` and assert these five headings appear in order in the course-map container: `היפוך המטה-מודל`, `עמימות, קשב ויחסים`, `בניית משפטי השפעה`, `העמקה ומטאפורות`, `הנחות יסוד בשפה`.

- [ ] **Step 3: Add a test for Meta Model route reuse**

From the course selector, click `מטה-מודל`, then click its `פתח מילון` action and assert `window.location.hash === '#categories'`.

- [ ] **Step 4: Run the focused test and verify RED**

Run: `npm test -- src/App.test.tsx`
Expected: the new tests fail because the course entrance UI does not exist yet.

---

### Task 2: Implement the Home course door

**Files:**
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: existing `navigateTo(tab: string)` hash helper.
- Produces: Home-local view state `entrance | course-select | shfat-hashpaa`, with existing Home content untouched beneath the entrance experience.

- [ ] **Step 1: Add Home-local view state**

Import `useState` and define a union state for the three Home subviews. Default to `entrance`.

- [ ] **Step 2: Render the two large entrance cards**

At the top of Home render:
- `אני חדש` with copy that says no prior NLP knowledge is required; clicking scrolls/continues to the existing public Home content.
- `אני תלמיד בקורס`; clicking switches to `course-select`.

Keep the current hero/WHY/big-idea/doors/toolbox below this entrance so the public experience is preserved.

- [ ] **Step 3: Render course selection**

In `course-select`, render two cards:
- `מטה-מודל`, with `פתח מילון` → `categories` and `אימון זיהוי` → `practice`.
- `שפת ההשפעה`, with an action opening the local `shfat-hashpaa` map.
Include a `חזרה` control to return to `entrance`.

- [ ] **Step 4: Render the five Shfat HaHashpaa sections**

Show the five section names in numbered order. Part 1 exposes verified actions to `categories` and `practice`. Parts 2–5 show a quiet badge/copy `אימונים ייעודיים יתחברו כאן` and no invented link.
Include `חזרה לקורסים`.

- [ ] **Step 5: Add scoped styling**

Add `course-door-*` classes in `src/styles/app.css` for a clear RTL top-to-bottom flow: two large entrance cards, calm course cards, numbered section list, responsive stacking on narrow screens. Reuse current CSS variables; do not introduce a second design system.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- src/App.test.tsx`
Expected: all App tests pass.

---

### Task 3: Regression verification

**Files:**
- No production file changes unless verification exposes a regression.

**Interfaces:**
- Consumes: completed Tasks 1–2.
- Produces: verified branch ready for review.

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: TypeScript, Vite build, and prepare-dist all succeed.

- [ ] **Step 3: Inspect the diff**

Confirm only the Home flow/tests/styles and the approved docs changed; no existing feature was removed or renamed.

- [ ] **Step 4: Commit implementation**

Commit message: `feat: add course student entry door`
