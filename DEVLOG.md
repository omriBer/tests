# FitnessMate - תיעוד פיתוח

## חוקי עבודה קבועים
1. **כל שינוי מתועד כאן** - כל תיקון, פיצ'ר, או שינוי חייב להיכתב בקובץ הזה
2. **הקובץ הזה תמיד מעודכן** - זו נקודת ההתייחסות הראשית להמשך עבודה בין סשנים
3. **לפני שמתחילים - קוראים כאן** - בכל סשן חדש יש לעבור על הקובץ כדי להתעדכן

---

## סטטוס נוכחי
האפליקציה מדופלית על Streamlit Community Cloud.
URL: https://fqrspr97o8vk4rz8muhpev.streamlit.app/

## מה נעשה עד כה

### 1. דיפלוי ל-Streamlit Cloud
- האפליקציה רצה מהריפו `omriBer/tests`, branch `main`, קובץ ראשי `app.py`
- רצה במצב דמו (ללא Supabase) - הנתונים לא נשמרים בין סשנים
- כדי לחבר Supabase: הגדרות > Secrets > להוסיף SUPABASE_URL ו-SUPABASE_KEY

### 2. תיקון תאימות Python (str | None)
**בעיה:** סינטקס `str | None` דורש Python 3.10+, עלול לגרום לקריסה בסביבות ישנות.
**קבצים שתוקנו:**
- `muscles.py` שורה 140: `str | None` -> `"str | None"`
- `app.py` שורה 312: `str | None` -> הוסר ה-type hint

### 3. תיקון Main Module
**בעיה:** Streamlit Cloud היה מוגדר להריץ `database.py` במקום `app.py`.
**פתרון:** שינוי ב-dashboard של Streamlit Cloud ל-`app.py`.

### 4. תיקון רינדור SVG (ניסיון 1 - base64)
**בעיה:** איורי SVG של קבוצות שרירים הוצגו כקוד גולמי במקום כאיורים.
**סיבה:** `st.markdown` עם `unsafe_allow_html=True` מסנן תגיות SVG ו-img עם data URIs.
**ניסיון ראשון:** המרה ל-base64 `<img>` - לא עזר, גם img מסונן.

### 5. תיקון רינדור SVG (ניסיון 2 - components.html)
**בעיה:** גם base64 img מוצג כקוד גולמי ב-`st.markdown`.
**פתרון:** החלפת כל ה-`st.markdown` שמכילות SVG ל-`streamlit.components.v1.html`:
- נוספה פונקציית עזר `render_svg_html()` ב-`app.py` שעוטפת HTML+CSS+SVG ומרנדרת דרך `components.html`
- הוחזר SVG inline (ללא base64) ב-`muscles.py`
- הוסר ה-import של `base64` ופונקציית `_svg_to_img`
- כל 10 המקומות שהכילו SVG הוחלפו ל-`render_svg_html` עם גובה מותאם

### 6. מחקר אפליקציות כושר מובילות
**נחקרו:** Hevy, Nike Training Club, JEFIT
**נשמר בקובץ:** `RESEARCH_FITNESS_APPS.md`
**תוכן:** פיצ'רים מפורטים לכל אפליקציה, טבלת השוואה, המלצות מתועדפות ל-FitnessMate
**הערה:** למשתמש יש שעון Garmin - נוספה חקירת אינטגרציית Garmin Connect API

### 7. תחקיר מלא - 4 משימות
**נשמר בקובץ:** `RESEARCH_TASKS.md`
**תוכן:**
- משימה 1: אפשרויות תמונות (free-exercise-db, ExerciseDB, MuscleWiki)
- משימה 2: ארכיטקטורת קואצ' חכם + אינטגרציית Garmin (Body Battery, שינה, סטרס)
- משימה 3: מבנה JSON מפורט לתרגילים ותבניות אימון
- משימה 4: טרנדי עיצוב 2026 (Dark mode, Glassmorphism, shadcn-ui)
- תלויות בין משימות וסדר ביצוע מומלץ
- Garmin מופה לכל משימה

**הערה:** למשתמש יש שעון Garmin - אינטגרציה דרך `garminconnect` (Python)

### 8. מאגר תרגילים + שדרוג תבניות אימון
**תאריך:** 2026-02-14

**קבצים שנוצרו:**
- `exercises_db.json` - מאגר של **120 תרגילים** בעברית ואנגלית
  - חלוקה לפי שרירים: חזה (15), גב (12), כתפיים (11), זרועות (12), בטן (12), רגליים (17+), גוף מלא/קרדיו (15), גמישות/מתיחות (16)
  - כיסוי ציוד: bodyweight (72), dumbbell (24), machine (12), barbell (5), bands (7)
  - כל תרגיל כולל: שם עברי, שם אנגלי, שריר ראשי/משני, ציוד, מיקומים, רמה, הוראות בעברית
- `exercises_data.py` - מודול Python לטעינת וחיפוש תרגילים
  - `load_exercises()` - טעינה עם cache
  - `get_exercise(id)` - תרגיל בודד
  - `search_exercises(muscle, equipment, location, level)` - סינון
  - `get_exercises_for_template(template)` - תרגילים מלאים לתבנית
  - `get_warmup_exercises()` / `get_cooldown_exercises()` - חימום/שחרור
  - `get_exercise_image_url()` - URL לתמונה מ-free-exercise-db

**קבצים ששודרגו:**
- `templates_data.py` - שודרג מ-30 ל-**46 תבניות**, כל תבנית כוללת:
  - `exercises` - רשימת תרגילים עם sets, reps, rest_sec
  - `warmup` - רשימת תרגילי חימום
  - `cooldown` - רשימת תרגילי שחרור
  - תבניות חדשות: חזה ביתי, גב ביתי, גומיות, זרועות חדר כושר, בטן חדר כושר, כוח בחוץ, HIIT בחוץ, התעוררות, כתפיים+משקולות, חזה+גב, רגליים+משקולות, ישבן ביתי, אימון משפחתי, הליכה 45 דק, עליון/תחתון

- `app.py` - שינויים:
  - ייבוא `exercises_data` module
  - `render_templates()` - כל כרטיס תבנית מציג שמות תרגילים (3 ראשונים + ספירה)
  - `render_log_workout()` - כשתבנית נבחרה, מוצגת רשימת תרגילים מלאה ב-expander (חימום, עיקריים, שחרור)

- `coach.py` - שינויים:
  - `get_ai_suggestion()` - ההצעה כוללת שמות תרגילים ספציפיים ("כולל: שכיבות סמיכה, סקוואט, פלאנק")

**אימות:**
- כל exercise_id בתבניות מצביע על תרגיל קיים ב-JSON (100% תקין)
- סינון לפי muscle/equipment/location עובד
- 120 תרגילים, 46 תבניות

## משימות בתור (לפי סדר מומלץ)
1. ~~יצירת JSON תרגילים מפורט ותבניות אימון~~ ✅ הושלם
2. שדרוג הקואצ' - שיח חכם ופרואקטיבי + Garmin
3. החלפת איורי SVG בתמונות איכותיות
4. מתיחת פנים לאפליקציה - עיצוב 2026

## בעיות פתוחות
- לבדוק שהאיורים מרונדרים נכון אחרי הדיפלוי האחרון (components.html)
- אין חיבור ל-Supabase (רץ במצב דמו)

## מבנה הפרויקט
| קובץ | תפקיד |
|---|---|
| `app.py` | אפליקציה ראשית - Streamlit UI, ניווט, 4 דפים |
| `config.py` | קבועים - סוגי אימונים, שרירים, מיקומים |
| `database.py` | שכבת נתונים - Supabase / מצב דמו |
| `coach.py` | לוגיקת קואצ' - הודעות, הצעות, תובנות + שמות תרגילים |
| `muscles.py` | איורי SVG של קבוצות שרירים |
| `templates_data.py` | 46 תבניות אימון עם תרגילים מפורטים |
| `exercises_db.json` | מאגר 120 תרגילים (JSON) |
| `exercises_data.py` | מודול טעינה וחיפוש תרגילים |
| `schema.sql` | סכמת DB ל-Supabase |
| `styles.css` | עיצוב CSS - ירוק/כחול, RTL, mobile-first |
