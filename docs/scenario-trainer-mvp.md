# Scenario Trainer MVP

## PRD
- Feature: `Scenario Trainer: Unspecified Verb -> Execution`.
- Goal: להפוך הוראות עמומות לתהליך ביצוע קצר וברור, עם פחות תגובות כעס/בושה.
- Platform: אפליקציית Web סטטית (`HTML/CSS/JS`), RTL, mobile-first, ללא backend.
- Data: סצנות נטענות מקובץ `data/scenario-trainer-scenarios.json`.
- Persistence: `localStorage` עבור הגדרות, היסטוריה, ניקוד ורצפים.
- Flow per scene: `Scenario -> Option -> Feedback -> Blueprint -> Score`.

## State Machine
`HOME -> DOMAIN_PICK -> SCENARIO -> OPTION_PICK -> FEEDBACK -> BLUEPRINT -> SCORE -> NEXT_SCENARIO`

Rules:
- `HOME`: כניסה למודול + ניווט ל-Prisms/History/Settings.
- `DOMAIN_PICK`: בחירת תחום, רמה, וגודל ריצה (5-10 סצנות).
- `SCENARIO`: הצגת סיפור + 5 אופציות (4 אדומות, 1 ירוקה).
- `OPTION_PICK`: נעילה רגעית של הבחירה.
- `FEEDBACK`: אנימציית `X`/`✓` + משוב קצר.
- `BLUEPRINT`: מטרה, צעד ראשון, 3-7 שלבים, תקיעה, Plan B, Done.
- `SCORE`: כוכבים, ניקוד, רצף ירוק, מעבר לסצנה הבאה.
- `NEXT_SCENARIO`: טעינת סצנה הבאה או סיום סשן.

## Wireframe Notes
- Home buttons: `סצנות`, `פריזמות (Drag&Drop)`, `היסטוריה`, `הגדרות`.
- Scenario card: תפקיד/כותרת/סיפור קצר + משפט לא-מפורש.
- Option buttons: גדולים עם אימוג'י; נגישים למובייל.
- Feedback: חיווי חזותי 1s עם הסבר 1-2 שורות.
- Blueprint: תצוגה קומפקטית; כפתור העתקת משפט ירוק.
- Prism mini-wheel: מופיע רק אחרי תשובה ירוקה (אם מאופשר בהגדרות).
- History: רשימת סצנות שהושלמו + הערות משתמש + ייצוא JSON.

## JSON Schema (Simplified)
```json
{
  "version": "1.0.0",
  "domains": [{ "id": "parenting", "label": "הורות" }],
  "difficulties": [{ "id": "easy", "label": "קל", "level": 1 }],
  "optionTemplates": {
    "red": [{ "id": "A", "type": "red_identity_blame", "score": 0 }],
    "green": { "id": "E", "type": "green_meta_model", "score": 1 }
  },
  "prismWheel": [{ "id": "goal", "label": "מטרה", "question": "...", "example": "..." }],
  "safetyKeywords": ["להתאבד", "suicide"],
  "scenarios": [
    {
      "scenarioId": "work_bugfix_003",
      "domain": "work",
      "level": 3,
      "difficulty": "hard",
      "title": "תסגור את הבאג",
      "story": ["...", "..."],
      "unspecifiedVerb": "לסגור באג",
      "expectation": { "speaker": "PO", "belief": "...", "pressure": "..." },
      "stuckPointHint": "...",
      "hiddenSteps": ["...", "..."],
      "alternatives": ["...", "..."],
      "greenSentence": "...",
      "greenBlueprint": {
        "goal": "...",
        "firstStep": "...",
        "steps": ["...", "..."],
        "stuckPoint": "...",
        "doneDefinition": "...",
        "planB": "..."
      }
    }
  ]
}
```

## Acceptance Tests
1. Start a run of 10 scenarios and finish without UI or state errors.
2. Every scenario ends with a visible blueprint כולל `צעד ראשון`.
3. Score logic: only green option gives `+1` score and `+1` star.
4. Progress/history persists after full page refresh.
5. Copy green sentence works.
6. Export JSON file includes completed scenarios and user notes.
7. UI is RTL and readable on <=768px width.
8. If note contains a safety keyword, flow stops and safety notice is shown.

## Manual QA Checklist
1. Open tab `Scenario Trainer` from navigation and from home CTA.
2. Verify domain + difficulty selectors populate from JSON.
3. Verify option colors (`red`/`green`) and animation (`X`/`✓`) on feedback.
4. Verify prism wheel appears only on green answers and can be disabled in settings.
5. Verify history entries include title, selected response, timestamp, and optional note.
6. Verify clear history action resets stats and list.
7. Verify sound toggle in settings disables scenario sounds only.
8. Verify session completion returns to trainer home with updated stats.
