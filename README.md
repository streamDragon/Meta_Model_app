# 🧠 Meta Model Gym — מעבדת שפה לאימון קוגניטיבי-לשוני

אפליקציית אימון לתרגול **Meta Model** של NLP (Bandler & Grinder): לזהות מחיקה,
עיוות והכללה, לשאול שאלות מדויקות יותר, ולהפוך כוונות עמומות לתוכניות פעולה.

> כלי אימון ורפלקציה עצמית — לא כלי אבחון קליני ולא תחליף לטיפול.

## ✨ מה יש באפליקציה

| פיצ'ר | מה מתרגלים | סטטוס |
| --- | --- | --- |
| **קטגוריות** | שלוש משפחות ההפרה (מחיקה, עיוות, הכללה) עם 11 תתי-דפוסים | production |
| **תרגול (Trainer)** | זיהוי מהיר של סוג ההפרה — MCQ עם משוב, רמזים ו-XP | production |
| **Blueprint Builder** | הפיכת פעולה עמומה לתוכנית: צעד ראשון, תנאים, Plan B | production |
| **מעבדת פריזמות** | סריקת משפט דרך פריזמה בחמש שכבות + המלצת Pivot | beta |
| **מעבדת ערכים ואילוצים** | `אני רוצה ___ אבל ___` — מפת שתי קומות, התנגשויות ואבחון | beta |
| **כלים שמורים** | קישורים לכלים סטטיים טובים שנשמרו מהגרסה הפרודקשנית | production |
| **בית / התקדמות** | Streak, XP, תגים, סשנים ומשימה הבאה | production |

הכל **ללא AI**: התוכן מגיע מחבילות JSON מובנות (`packs/`) שאפשר להחליף ולהרחיב.

## 🧰 כלים שמורים מהגרסה הפרודקשנית

המעבר ל-React לא מוחק את העבודה הטובה שכבר הייתה בפרודקשן. דף **כלים שמורים**
בתוך האפליקציה מפנה לכלים הסטטיים ששוחזרו מהענף הראשי: Classic 2,
Classic Classic, Iceberg Templates, Scenario Trainer, Breen Table Lab,
Prism Lab, Sentence Morpher, Living Triples, Verb Unzip ו-Context Radar.

בבנייה (`npm run build`) הקבצים הסטטיים האלה מועתקים ל-`dist/` לצד האפליקציה
החדשה, כדי שאפשר יהיה לבדוק ולפרוס אותם בלי לערבב את הקוד הישן לתוך מעטפת React.

## 🛠️ פיתוח

```bash
npm install
npm run dev       # שרת פיתוח (Vite)
npm test          # בדיקות (Vitest)
npm run build     # בנייה ל-dist/ + העתקת הכלים השמורים
npm run preview   # תצוגה מקדימה של הבנייה
```

## 📁 מבנה הפרויקט

```text
Meta_Model_app/
├── index.html              # נקודת כניסה של Vite
├── src/
│   ├── main.tsx            # bootstrap
│   ├── App.tsx             # מעטפת האפליקציה: ניווט, splash, providers
│   ├── registry.ts         # רישום הפיצ'רים — מקור אמת יחיד לניווט ולסטטוסים
│   ├── types.ts            # טיפוסי חבילות התוכן
│   ├── features/           # עמוד לכל פיצ'ר (home, categories, trainer, ...)
│   ├── lib/                # לוגיקה טהורה: trainer, pivot, blueprint, valuesLab
│   ├── store/              # progress (XP/streak/badges), hint toast, bridges
│   ├── styles/             # מערכת עיצוב מבוססת tokens (RTL-first, Heebo)
│   └── data/content.ts     # מיזוג חבילות התוכן
├── packs/                  # חבילות תוכן JSON מגורסאות (schemaVersion, source)
├── js/, css/, data/, assets/# כלים סטטיים שמורים מהגרסה הפרודקשנית
├── scripts/prepare-dist.mjs # העתקת הכלים השמורים ל-dist/
└── docs/AUDIT.md           # דוח ביקורת מוצר וארכיטקטורה + תוכנית שלבים
```

## 🗺️ מפת דרכים

ראו [docs/AUDIT.md](docs/AUDIT.md) — דוח ביקורת מלא ותוכנית בשישה שלבים:
ארכיטקטורה ✅ → עיצוב דסקטופ ✅ → מובייל ומסכי fallback ✅ → ניקוי מודל תוכן ✅ →
מעבדת ערכים/אילוצים ✅ → QA וליטוש (בתהליך).

## 📚 מקורות תיאורטיים

Bandler & Grinder — *The Structure of Magic*; Robert Dilts — רמות לוגיות;
עקרונות Reframing. חלקים המסומנים `placeholder` ב-registry ממתינים לאימות מקור.

---

פיתוח: streamDragon · [GitHub](https://github.com/streamDragon/Meta_Model_app)
