# פרומפטים מעודכנים ל-Claude Code / VS Code
## מותאם לקוד הקיים — index.html, RTL, Hebrew

---

## 🔧 הגדרות
- **מודל:** Sonnet (מספיק)
- **כלל:** prompt אחד = שינוי אחד
- **אחרי כל prompt מוצלח:** `git add . && git commit -m "prompt N: description" && git push origin main`

---

## פרומפט 1 — ניקוי ויזואלי של Landing

```
Read the full index.html file in this project.

This is a Hebrew RTL math visualization app for Israeli high school students (ages 14-18).

DO NOT rewrite the file. Only modify the existing landing/opening section.

The landing screen currently has 3 main entry paths:
- Option 01: "תראה לי איך זה עובד" (guided tour)
- Option 02: "תן לי תרגיל קל להתחלה" (easy exercise)
- Option 03: "יש לי שאלה משלי" (user's own question)

Task: Improve ONLY the landing screen layout for mobile. Keep all existing functionality intact.

Changes needed:
1. Make the layout mobile-first — assume 390px width phone screen
2. Reduce visual clutter — hide or collapse secondary buttons/links on mobile. The 3 entry paths above should be the DOMINANT visual elements
3. Make these 3 entry path buttons more prominent: larger tap targets (min 48px height), bigger icons, clearer text
4. Add subtle CSS entrance animations (fade-in + slide-up, staggered 0.1s delay between the 3 options)
5. Keep the existing opening-poster.png image but make it responsive (max-width: 100%, auto height)
6. Reduce font sizes for mobile — headings max 22px, body 14px
7. Everything must stay RTL
8. Use @media (max-width: 500px) for mobile overrides so desktop stays unchanged

Do NOT touch any exercise logic, graph rendering, parameter editing, quiz functionality, or the #tutor-btn.
Show me what you changed.
```

**בדיקה:** פתח DevTools → Toggle Device (iPhone 14) → ודא ש-3 הכפתורים בולטים ויש אנימציה

**Commit:** `git commit -m "prompt 1: mobile-first landing cleanup"`

---

## פרומפט 2 — הוספת מסקוט SVG

```
Read the full index.html file in this project.

Add a simple animated SVG mascot character. This is SEPARATE from the existing #tutor-btn AI chat — the mascot is a lightweight visual feedback layer, not a chat interface.

Requirements:
1. Create a pure CSS+SVG mascot: a friendly round purple character (~60px) with eyes and a math symbol (∑) on top
2. The mascot has 4 CSS classes for moods:
   - .mascot-idle — neutral face, gentle breathing animation
   - .mascot-happy — smile, subtle bounce
   - .mascot-thinking — raised eyebrow, slight head tilt
   - .mascot-celebrating — big smile, bounce up and down
3. Position: fixed, bottom-left of screen (left: 16px, bottom: 80px), z-index high enough to be above content but below modals
4. Add a speech bubble div (.mascot-bubble) that appears next to the mascot with short Hebrew RTL text
5. Hidden by default (display: none)
6. Add a global JS function:

   function showMascot(mood, message, duration) {
     // mood: 'idle' | 'happy' | 'thinking' | 'celebrating'
     // message: Hebrew string to show in bubble
     // duration: ms before auto-hide (default 3000)
     // Shows mascot + bubble, then fades out after duration
   }

7. All animations must be pure CSS — no libraries
8. The mascot should not overlap or interfere with the existing #tutor-btn

Do NOT change any existing functionality. Only ADD new HTML, CSS, and JS.
```

**בדיקה:** פתח console, הקלד `showMascot('happy', 'בדיקה!')` → ודא שהמסקוט מופיע ונעלם

**Commit:** `git commit -m "prompt 2: add SVG mascot system"`

---

## פרומפט 3 — חיבור המסקוט לאירועים

```
Read the full index.html file.

I previously added a showMascot(mood, message, duration) function that shows a small animated SVG character with a speech bubble.

Now connect it to existing app events. Search the code and find where these things happen:

1. User answers correctly (look for success/correct answer handling) → add: showMascot('celebrating', 'מעולה! הבנת את זה 🎉')
2. User answers incorrectly (look for wrong/error answer handling) → add: showMascot('thinking', 'ננסה שוב. תסתכלו על הגרף!')
3. User completes a full question/exercise → add: showMascot('happy', 'סיימת שאלה! ממשיכים 💪')
4. User first loads the landing screen → add: showMascot('idle', 'היי! מה נלמד היום?', 4000)
5. User opens "יש לי שאלה" feature → add: showMascot('thinking', 'בוא נפרק את השאלה ביחד')
6. User moves the point on the curve and finds an extremum (slope ≈ 0) → add: showMascot('happy', 'שימו לב! השיפוע מתקרב ל-0')

For each one, tell me which function/event handler you found and where you added the call.

Do NOT modify any existing logic. Only ADD showMascot() calls at the right moments.
```

**בדיקה:** תרגל שאלה → ענה נכון → ודא שהמסקוט צץ

**Commit:** `git commit -m "prompt 3: connect mascot to app events"`

---

## פרומפט 4 — שיפור Mobile UX של מסך התרגול

```
Read the full index.html file.

Improve the mobile UX of the exercise/practice screen — the screen where users interact with the graph, move a point on the curve, and answer questions.

DO NOT change the graph rendering logic, math calculations, or the parameter system.

CSS/layout changes only:
1. On screens < 500px width:
   - Graph should take full width with 8px side padding
   - Question text and step instructions should appear ABOVE the graph, not beside it
   - Answer buttons / input fields: min 48px tall, 14px font, full width
2. The slider that moves the point on the curve: make it wider (calc(100% - 32px)) and the thumb larger (28px diameter) on mobile
3. Add a sticky bottom bar with the main action button ("בדוק תשובה" or equivalent) — always visible even when scrolling
4. Add a thin progress bar at the very top of the screen showing current step (e.g., step 2 of 4) — use the app's existing purple color (#6C5CE7 or whatever purple is used)
5. Make sure the "hot/cold" meter and hint areas are visible without scrolling on a 667px height screen (iPhone SE)

Use @media (max-width: 500px) so desktop layout is not affected.
```

**בדיקה:** DevTools → iPhone SE → פתח תרגיל → ודא שהכל נראה בלי scroll מיותר והסליידר קל לשימוש

**Commit:** `git commit -m "prompt 4: mobile UX for exercise screen"`

---

## פרומפט 5 — Gamification (streak + נקודות)

```
Read the full index.html file.

Add a gamification layer using localStorage.

1. Track these values in localStorage under key 'mathviz_progress':
   - totalPoints (number, starts at 0)
   - currentStreak (number of consecutive days, starts at 1)
   - lastActiveDate (ISO date string)

2. On app load:
   - If lastActiveDate is today → do nothing
   - If lastActiveDate is yesterday → currentStreak++
   - If older or missing → currentStreak = 1
   - Update lastActiveDate to today

3. Points:
   - +10 for correct answer
   - +5 for completing a step
   - +25 for completing a full question
   Add a global function: addPoints(amount) that saves and triggers the animation

4. Display: Add the streak and points INSIDE the existing #top-bar element (do NOT create a new header bar). Add two small badges on the left side of the top-bar:
   - 🔥 streak number (orange badge)
   - ⭐ total points (purple badge)
   - Each badge: background pill shape, ~28px height, font 12px bold

5. When points are added, briefly animate the points badge: scale(1.2) then back, with the +N amount shown for 1 second

Do NOT change existing #top-bar layout/functionality. Only ADD elements inside it.
```

**בדיקה:** ענה נכון → ודא שהנקודות מתעדכנות עם אנימציה. סגור ופתח → streak שמור.

**Commit:** `git commit -m "prompt 5: gamification streak and points"`

---

## פרומפט 6 — פירוק שאלת בגרות עם AI

```
Read the full index.html file.

The app has an existing "יש לי שאלה" feature where users type or photograph a bagrut exam question. There's also an existing AI connection configured through the teacher/admin settings panel ("כתובת שרת התיווך" and "שם המודל" fields).

Enhance the flow AFTER the question text is available (typed or extracted from image):

1. Add a function decomposeQuestion(questionText) that calls the EXISTING AI endpoint (same one used by the tutor chat). Do NOT create a new endpoint or hardcode any URL.

2. The system prompt for the AI call should be:

"""
אתה עוזר למתמטיקה. קיבלת שאלת בגרות. פרק אותה לשלבים ויזואליים שתלמיד צריך לשלוט בהם כדי לפתור.

השאלה: {questionText}

החזר JSON בלבד, בלי markdown ובלי backticks:
{
  "steps": [
    {
      "title": "שם השלב",
      "what_to_visualize": "מה צריך לדמיין כדי להבין",
      "visual_skill": "זיהוי קיצון / משיק / שיפוע / חיתוך / סימטריה / צורת פולינום / אחר",
      "hint": "רמז ויזואלי קצר"
    }
  ],
  "required_visual_skills": ["רשימת מיומנויות"],
  "algebraic_expressions": ["ביטויים אלגבריים שצריך לדמיין"]
}
"""

3. After getting the response, show a step-by-step card view:
   - At the top: required_visual_skills as colored tag pills (purple background, white text)
   - Each step as a card: title in bold, what_to_visualize as body text, visual_skill as a small colored tag
   - algebraic_expressions in a special "ביטויים לדמיין" section with a different background
   - Navigation: "הבא ←" / "→ הקודם" buttons to move between steps
   - Progress dots showing which step you're on

4. If AI endpoint is not configured, show: "כדי לפרק שאלות צריך להגדיר חיבור AI בהגדרות המורה"

5. Add a button "פרק את השאלה" that appears after text is entered/scanned, which triggers decomposeQuestion()

Keep the existing camera/upload/text-input flow completely unchanged. Only ADD the decomposition after text is available.
```

**בדיקה:** הקלד שאלת בגרות → לחץ "פרק" → ודא שהכרטיסיות מופיעות

**Commit:** `git commit -m "prompt 6: AI bagrut question decomposition"`

---

## פרומפט 7 — מסך מידע להורים

```
Read the full index.html file.

Add a "להורים ומורים" section accessible from the landing page.

1. On the landing screen, BELOW the 3 main entry paths and ABOVE the footer area, add a button:
   "👨‍👩‍👧 להורים ומורים — למה זה עובד?"
   Styled subtly — not as prominent as the 3 main paths. Use a text-link style or outline button.

2. When clicked, show a full-screen modal/overlay (like existing modals in the app) with:

   Header: "מה חסר בשיעורי מתמטיקה?"

   Intro paragraph:
   "מורים מסבירים ונותנים תרגילים — אבל בדרך כלל לא מאמנים את היכולת לדמיין. מחקרים מ-30 שנה מראים קשר חזק בין יכולת ויזואלית מרחבית לבין הצלחה במתמטיקה. האפליקציה הזו ממלאה את החלק שחסר."

   Research section (3 collapsible items with ▼ toggle):
   - "מחקר עם 287 תלמידים: אימון ויזואלי דיגיטלי משולב בשיעורים הוביל לשיפור משמעותי (Lowrie et al., 2023)"
   - "הקשר בין חשיבה מרחבית למתמטיקה חיובי ועקבי בכל הגילאים (Xie et al., 2020)"
   - "אימון מיומנויות מרחביות בכיתה ז' הוביל לשיבוץ בקורסי מתמטיקה מתקדמים (Sorby, NSF)"

   FAQ section (also collapsible):
   - "כמה זמן ביום?" → "10-15 דקות מספיקות. מחקרים מראים ששגם 40 דקות בשבוע לאורך 14 שבועות מספיק."
   - "למי זה מתאים?" → "כל תלמיד 14-18, במיוחד כאלה שמבינים את החומר אבל נתקעים בשאלות."
   - "מה ההבדל מתרגול רגיל?" → "תרגול רגיל מאמן פרוצדורות. כאן מאמנים את היכולת לראות ולדמיין מתמטיקה."

3. Close button (✕) at top-right, styled consistently with existing modals

Style: clean white background, professional typography, RTL, mobile-friendly.
Match the existing modal styling in the app (border-radius, shadows, transitions).

Do NOT change any existing functionality.
```

**בדיקה:** Landing → לחץ "להורים" → ודא שהמודל נפתח ונסגר, כל accordion עובד

**Commit:** `git commit -m "prompt 7: parents info modal with research"`

---

## 🛟 פרומפט חירום — אם משהו נשבר

```
The last change broke [DESCRIBE WHAT'S BROKEN].

Look at the most recent changes you made to index.html.
Revert ONLY the parts that caused the breakage.
Keep everything else that still works.
Tell me exactly what you reverted and why.
```

או פשוט: `git revert HEAD`
