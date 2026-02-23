# פתרון בעיית גרסה Google Sites

## 🐛 הבעיה
לאחר שהיית עושה commit ו-push ל-Git, הגרסה בGoogle Sites לא התעדכנת בעקביות:
- לפעמים כן, לפעמים לא
- זה נראה כאילו ממש מקושר לבעית caching

## 🔍 השורש של הבעיה
Google Sites (וברוברים בכלל) שומרים cached גרסאות של קבצים, נוצר מצב של circulation:
1. `package.json` מעדכן את הגרסה (v1.0.19 → v1.0.20)
2. `sync-entry.mjs` עוד צריך לעדכן את `index.html` עם הגרסה החדשה
3. אבל אם `index.html` עצמו מקוש - הדפדפן לא רואה את הגרסה החדשה בתוך ה-HTML
4. בעקבות זאת - כל התחזוקות האחרות מנסים להשתמש בגרסה הישנה

## ✅ הפתרון שלי
יצרתי מערכת double-cache-busting שכוללת:

### 1️⃣ הוספתי `data-build-time` עם timestamp
כל פעם ש-`sync-entry.mjs` רץ, הוא מוסיף timestamp טרי לתוך HTML:
```html
<html data-app-version="1.0.19" data-build-time="1771808505399">
```
הtimestamp הזה משתנה **בכל run**, שמבטיח cache-busting מוחלט.

### 2️⃣ עדכנתי את cache-busting logic
עכשיו כל fetch לקבצים (package.json, js, css) משדרג **שניים** parameters:
- `?v=1.0.19` (גרסה)
- `?t=1771808505399` (timestamp)

זה אומר שגם אם דפדפן יצא לcache, הוא חייב להוריד את הקבצים מחדש.

### 3️⃣ שיפרתי את ה-test-ui-wiring
עכשיו הוא גם בודק ש-`data-build-time` קיים ועדכני.

### 4️⃣ הוסף pre-commit hook
יצרתי git hook שמבטיח ש-`sync-entry.mjs` רץ **לפני כל commit**. זה אומר שלעולם לא תשכח להריץ את זה.

## 🚀 איך להשתמש
**עדכון:** כרגע אתה כבר משתמש בזה! 

כשאתה עושה:
```bash
npm run release:auto
```
או even כשאתה עושה commit ישירות, ה-hook יוודא ש:
1. ✅ `sync-entry.mjs` רץ
2. ✅ `index.html` מעדכן עם גרסה חדשה
3. ✅ `index.html` מעדכן עם timestamp חדש
4. ✅ שניהם מcache-busted בצורה שתפס אחד ללא

## 📋 בדיקות
לאחר commit כלשהו, בדוק:
```bash
npm run test:ui-wiring
```
זה יוודא ש:
- `data-app-version` זהה ל-`package.json` version
- `data-build-time` קיים ותקין
- כל ה-UI elements עם הגרסה מקום בתוכן תקין

## 🎯 מה צפוי להשתנות
כאשר תרחצ את הבא `release:auto` או commit:
1. Timestamp חדש יתווסף ל-HTML
2. Google Sites יבחור שיש קבצים חדשים (ל-v ולs t query params)
3. הדפדפן יהדרוס את ה-cache
4. מה שאתה תראה בGoogle Sites יהיה תמיד העדכני ביותר!

## 🔧 ניפוי בעיות
אם בעדיין יש בעיות:
1. **בדוק את Network tab** ב-DevTools - וודא ש-URLs כוללים את `?v=` ו-`?t=`
2. **Force refresh**: Ctrl+Shift+Delete (בדיקה של הcache) או Ctrl+F5 (reload without cache)
3. **בודק את index.html source** - צריך לראות את `data-build-time` עם timestamp טרי

## 📝 הערות
- ה-sync-entry script יעברר בכל: `npm run build`, `npm run test:all`, ו git-pre-commit hook
- ה-cache-busting הוא automatic - לא צריך לעשות כלום ידנית
- זה עובד עם כל CDN ו-static site provider (Google Sites, GitHub Pages, וכו')

