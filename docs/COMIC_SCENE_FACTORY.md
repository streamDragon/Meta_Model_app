# Comic Scene Factory (המון סצנות בלי להסתבך)

המטרה: לייצר המון סצנות קומיקס תוך דקות, ע"י שכפול SVG קיים והחלפת טקסטים/דמויות.

## מה כבר יש בפרויקט
- `assets/svg/comics/scenes/` סצנות מוכנות
- `assets/svg/comics/scenes/template.svg` תבנית ברירת מחדל (ASCII-safe)
- `assets/svg/comics/panels/` פאנלים תבניתיים
- `assets/svg/stickers/` בועות, SFX, badges
- `assets/svg/characters/` דמויות
- `assets/svg/props/` פרופים
- `assets/svg/demo/index.html` דף תצוגה מהיר לכל הערכה

## יצירת סצנה חדשה (פקודה אחת)
דוגמה: יצירת `כסף_ארנונה.svg` מתוך תבנית קיימת

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-comic-scene.ps1 `
  -SceneName "כסף_ארנונה" `
  -Template "assets/svg/comics/scenes/ביורוקרטיה_טופס.svg" `
  -Domain "כסף" `
  -StoryLine1 "עירייה: `"תשלם ארנונה עד היום`"" `
  -StoryLine2 "את/ה: `"אין לי קוד משלם`"" `
  -GreenLine "✅ מה המספר תשלום ומה הצעד הראשון?" `
  -CharacterTop "מאיה.svg" `
  -CharacterBottom "יוסף.svg" `
  -Force
```

לאחר יצירה אפשר לפתוח:
- `assets/svg/demo/index.html`

## יצירה המונית (Batch)
יש קובץ דוגמה:
- `scripts/comic-scenes.batch.example.json`

הרצה:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-comic-scene.ps1 `
  -BatchFile "scripts/comic-scenes.batch.example.json"
```

## מה הסקריפט מחליף אוטומטית
- כותרת סצנה
- שורת תחום
- 2 שורות סיפור
- משפט ירוק תחתון
- 2 דמויות (עליון/תחתון)

## טיפ עבודה מהירה
1. בחר תבנית קרובה (`עבודה_מצגת.svg` / `ביורוקרטיה_טופס.svg` וכו').
2. החלף רק 3 טקסטים + 2 דמויות.
3. שמור שם קובץ בתחום ברור (`כסף_...`, `בריאות_...`).
4. חזור על זה ברצף עם קובץ Batch.
