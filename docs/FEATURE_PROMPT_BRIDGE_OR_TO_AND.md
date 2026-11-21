# PROMPT FOR THE CODER AGENT: "The Bridge — from OR to AND" (הגשר: מ"או" ל"וגם")

> Build request from Haggai (product owner), written by Claude on 2026-11-21.
> Target app: this repo (Meta Model Gym, a general NLP and therapy practice app). Live preview of `main`: https://meta-model-app-git-main-streamdragons-projects.vercel.app/
> Background research: `docs/FEATURE_SPEC_HIDDEN_BELIEF_XRAY.md` (sister feature, already shipped as beta in `src/features/hiddenbelief/`) and the book research folder `C:\Users\nlpis\wkspaces\BEYOND_WORDS_BOOK_RESEARCH_2026-11\` (file 06 = where this method comes from).

---

## 0. Your task in one paragraph

Build a new guided practice, **"The Bridge"**, at route `#bridge`. A person who feels torn between two things they care about ("honor my father" OR "be the father I want to be"; "work" OR "family"; "be honest" OR "keep the peace") is walked, one screen at a time, from **OR** to **AND**: each side gets its place, the person finds real moments where they already lived one side, then answers a "bridge question" built from their own words, names the new state in their own words, checks the name against the body, tests it on the trigger, and saves a card they come back to. It must work fully **without AI**, in Hebrew, phone-first, and be live on the `main` preview URL above when done.

Why this one: of everything studied, this is the move that helps the most people, on their own or with a therapist. Inner conflict between two values is universal, and the method is safe: it never asks anyone to attack a person or a value.

## 1. Before you write code (required)

1. Read `src/registry.ts` (FEATURES array: id, route, navGroup, status, mobileSupport…) and register the feature there like the others. Suggested: `navGroup: 'core'`, `status: 'beta'`, `theoryFamily: 'values-criteria'` (or add `'parts-integration'` if you think a new family is justified; say why in the commit).
2. Study `src/features/hiddenbelief/` (page, engine, tests, CSS) and `src/features/daily/` and reuse their patterns: one-step-per-screen layout, scroll-to-result, Hebrew RTL, local storage via `src/store/`, test style.
3. Check `api/hidden-belief.mjs` to see how an LLM call is (or is not) wired. This feature must not depend on it (see §7).
4. Check `git remote -v` and `git status`. The earlier handoff said `.git` pointed at a missing worktree; if commits or pushes fail, fix that first and report what you did.
5. Write at the top of your first commit message: route, files added, and any decision you made that this prompt left open.

## 2. Where the method comes from (so you keep it intact)

| Step in the flow | Source | Why it matters |
|---|---|---|
| Each side gets its place before joining | Haggai: "separate in order to connect"; parts as two speakers (Breen table row 1) | Joining too early (like a visual squash) fails |
| Find the value behind each side | NLP positive intention; Haggai's "creating logic": each side is logical by itself | Nobody is wrong; resistance drops |
| Collect 3 real moments, with senses | Grinder & DeLozier "inventory"; Erickson pacing; rows 6-7 (the inner representation); convincer strategy (most people need ~3 examples) | Change rests on experience the person already has |
| Pause, let it settle | Haggai's patience phase ("let it grow roots") | Don't rush to words |
| The bridge question: "When you are [moment], how is [other side] there too?" | Haggai's session; Milton Model presupposition ("how", "too") | The person builds the link themselves |
| Name it in your words; if stuck, tentative offers ("Some people call this…") | Haggai: lost performative, then the person owns it ("does that fit?") | The name must be theirs |
| Body check: does the name fit? | Gendlin, Focusing: handle + resonating, felt shift | The best available signal that it belongs to them |
| "What does that side need to know?" when one side tightens | Six-step reframing + IFS protector questions; Tad James "preserve the learnings" | The objecting side updates instead of being overruled |
| Trigger test + "How do you know it's different?" | TOTE test (Breen); Overdurf "How do you know?" (reality strategy) | Proves the change where the problem lives |
| Card + return on day 1/3/7 | Convincer "consistent / period of time"; spaced review already in the app | It holds over time |

Do not add techniques that are not in this table.

## 3. The flow (one screen per step, progress stepper on top)

Use the existing numbered stepper look (COACH/CRASH style). Every screen: one prompt, one input, "back", "continue". Short Hebrew copy. Everything the person wrote stays visible in a small "trail" at the top (collapsed on phone).

**Step 0 — Start.**
- One line: what this is ("כשנראה שצריך לבחור בין שני דברים חשובים"), ~7 minutes, private (stays on the device).
- Choose form of address: את / אתה / רבים (used in all generated sentences; see §6).
- Choose mode: "לעצמי" (self) or "עם מטופל/מתאמן" (practitioner; adds the structure view, §5).
- Safety line + link (§8).

**Step 1 — The OR.**
"מה הם שני הדברים שנראה שאי אפשר את שניהם?" Two fields: side A, side B. Optional: "מתי זה הכי מושך אותך לצד אחד?" (the trigger, e.g. "כשאבא מתקשר בערב").
Show 3 tappable examples that fill the fields (editable).

**Step 2 — Each side gets its place.**
Two cards, one per side: "מה חשוב לך ב־[A]?" / "מה חשוב לך ב־[B]?" One line each.
Fixed copy under it: "שני הצדדים הגיוניים. אף אחד מהם לא טועה."

**Step 3 — Inventory: when did you already live it?**
"ספר/י על רגע אמיתי שבו כבר חיית את [value of A]." Then ask the same for up to 3 moments (minimum 1; encourage 3). For each moment, small optional sense prompts: איפה היית? מה ראית? מה שמעת? מה הרגשת בגוף? (rows 6-7).
Let the person choose which side to collect moments for (default: the side they feel less of).

**Step 4 — Pause.**
A calm screen: their first moment shown in their words; "קח/י רגע. תן/י לזה לגדול." Gentle breathing ring, ~20 s, skippable. No text input.

**Step 5 — The bridge question.**
Generate from their words (§6): **"כשאת/ה [moment 1, in their words], איך [side B / its value] נמצא שם גם?"** Show it large. Under it: "אין צורך לענות מיד." Input: their answer (free text). Button "אין לי עדיין תשובה" → offers the same question with moment 2, then moment 3.

**Step 6 — Name it.**
"איך היית קורא/ת לזה, במילים שלך?" Input.
If they tap "קשה לי לנסח": show 3 tentative offers built from their two values, each prefaced "יש שקוראים לזה…" (e.g. "[value A] וגם [value B]", "[side A] בדרך שלי", "גם וגם"), plus "אף אחד מאלה". Choosing one copies it into the input so they can edit it.

**Step 7 — Body check.**
"אמור/אמרי לעצמך את השם לאט. מה קורה בגוף?" Multi-select chips: נשימה עמוקה יותר / רוגע בחזה / חום / דמעות / חיוך / שום דבר מיוחד / מתח / כיווץ.
Then: "השם מתאים?" → מתאים / כמעט / לא.
- **מתאים** → step 8.
- **כמעט** → "איזה חלק מתאים?" → edit the name → re-check (max 3 loops, then continue anyway).
- **לא**, or chips include מתח/כיווץ → "נראה שצד אחד עוד שומר על משהו חשוב." → "מה הצד של [A or B] צריך לדעת כדי שיוכל להירגע?" (free text) → back to step 6.

**Step 8 — Test it on the trigger.**
If a trigger was given: "דמיין/י את הרגע: [trigger]." Slider 0–10 "כמה זה מושך אותך לצד אחד?" first as it was, then "עכשיו, כשאתה/את יודע/ת ש[name]". Then: "איך את/ה יודע/ת שזה אחר עכשיו?" (free text).
No trigger → "דמיין/י את הפעם הבאה שזה יקרה" and the same.

**Step 9 — Keep it.**
A card: OR → AND (A וגם B), the name, the moments (short), the bridge question, the answer, one small step for this week (input: "צעד קטן אחד"), and the slider change.
Buttons: save (local), copy as text, start a new bridge. Schedule returns on day 1, 3 and 7 (reuse the existing spaced-review store if possible): on return, show the card, ask the body check again (step 7 only) and "did the small step happen?".

## 4. Home and navigation

- Register in `src/registry.ts`, route `#bridge`, icon in the app's style, Hebrew nav label "הגשר".
- Add a Home entry card (not a new bottom-bar item unless the bar has room): "קרוע/ה בין שני דברים חשובים? בוא/י נבנה גשר."
- If saved bridges have a due review, the Home "next step" area shows it.
- Optional (only if simple): one "bridge" item type in the daily set that replays the body check of a saved card.

## 5. Practitioner mode (structure view)

Same flow, plus a collapsible "מה עשינו כאן" panel per step that names the move:
- Step 2: positive intention / each part logical (row 1).
- Step 3: inventory, rows 6-7, convincer (3 examples).
- Step 5: presupposition ("איך", "גם"), Milton Model building a new link.
- Step 6: lost performative ("יש שקוראים לזה"), then the person owns it.
- Step 7: Gendlin's resonating.
- Step 8: TOTE test; "איך אתה יודע" = reality strategy.
In this mode the generated sentences may address the client in third person or "את/ה" per the start choice. Copy should say: "use with the client's consent; this is a practice tool, not a treatment protocol."

## 6. Sentence generation (rule-based engine, no AI)

Create `src/features/bridge/bridgeEngine.ts` with pure functions and tests:
- `buildBridgeQuestion({ moment, otherSide, otherValue, address })` → Hebrew string. Use the person's words verbatim (trim, strip trailing punctuation). Prefer the **value** of the other side if given, else the side itself.
- `buildNameOffers({ sideA, sideB, valueA, valueB })` → 3 strings, each starting "יש שקוראים לזה".
- `buildTriggerPrompt`, `buildNeedToKnowQuestion(side)`.
- Hebrew gender/number: drive verb and pronoun forms from `address: 'f' | 'm' | 'pl'` with small lookup tables (את מוצאת / אתה מוצא / אתם מוצאים, etc.). Never produce mixed forms like "את/ה" in generated sentences; use them only in fixed UI copy if you must.
- If a field is empty, fall back to a neutral phrasing; never render "undefined" or empty quotes.

## 7. AI (optional, off by default)

The feature must be complete without any model call. If `api/hidden-belief.mjs` shows a working, configured LLM path, you may add an optional "help me phrase the name" button that sends **only** the two values and the person's answer from step 5 (not the moments) and returns up to 3 name suggestions, shown with the same "יש שקוראים לזה…" wording. If no LLM is configured, hide the button. Document what you did.

## 8. Safety and privacy (required)

- **Private by default:** all text stays in local storage; no analytics on input text; a clear "מחק הכל" button.
- **Scope copy** (Step 0 and About): practice tool for everyday inner conflicts; not therapy and not for crises.
- **Risk words:** if any input contains self-harm, suicide or violence terms (reuse whatever list the X-Ray feature uses), stop the flow and show a short message to reach a professional or emergency service. Use a crisis line only if it is already verified in the app; otherwise generic wording.
- **No attacking:** no step asks the person to blame, curse or confront anyone. Copy must stay respectful of both sides, including family and religious values (e.g. honoring parents).
- **No diagnosis, no labels** about the person.

## 9. Tests and acceptance

Unit tests (engine) + a page test following the X-Ray tests. Must pass, together with the existing suite and the production build.

**Acceptance case (Moshe, fictional), address 'm':**
- A: "לכבד את אבא שלי"; value A: "כבוד והכרת תודה"
- B: "להיות האבא שאני רוצה להיות לילדים"; value B: "סבלנות ורוגע"
- Trigger: "כשאבא מתקשר בערב ומעיר על החינוך"
- Moment (for B): "כשיוסי שבר כוס וכרעתי לידו ושאלתי אם הוא בסדר"

Expected:
- Bridge question ≈ "כשאתה כורע ליד יוסי ושואל אם הוא בסדר, איך כבוד והכרת תודה נמצאים שם גם?" (exact wording may differ; it must use his moment and value A's words, masculine forms, "איך … גם").
- 3 name offers, each starting "יש שקוראים לזה".
- Choosing "לא" in the body check leads to "מה הצד של לכבד את אבא שלי צריך לדעת כדי שיוכל להירגע?".
- Saved card shows OR → AND, the name, the slider change, and day 1/3/7 returns.
- Fail if: any "undefined"/empty quote, mixed gender in a generated sentence, any network call with input text when AI is off, or the flow continues after a risk word.

## 10. Definition of done

- `#bridge` works on phone (390×844) and desktop, Hebrew RTL, one step per screen, feedback in view.
- Registered in `src/registry.ts`, reachable from Home and the "עוד" sheet.
- Tests and build pass. Commit with a clear message, push to `main`, and confirm the feature at **https://meta-model-app-git-main-streamdragons-projects.vercel.app/#bridge**. If the deployment is protected or fails, report the exact error instead of guessing.
- Update `docs/FEATURE_PURPOSE_AUDIT.md` with one entry for the feature.
- Report back: what you built, screenshots of steps 1, 5, 7 and 9 on phone, anything you could not do.
