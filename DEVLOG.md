# FitnessMate - תיעוד פיתוח

## חוקי עבודה קבועים
1. **כל שינוי מתועד כאן** - כל תיקון, פיצ'ר, או שינוי חייב להיכתב בקובץ הזה
2. **הקובץ הזה תמיד מעודכן** - זו נקודת ההתייחסות הראשית להמשך עבודה בין סשנים
3. **לפני שמתחילים - קוראים כאן** - בכל סשן חדש יש לעבור על הקובץ כדי להתעדכן

---

## סטטוס נוכחי
האפליקציה מדופלית על Streamlit Community Cloud.
URL: https://2zqfpmejabsauqxbkbcwys.streamlit.app/

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

**קבצים ששודרגו:**
- `templates_data.py` - שודרג מ-30 ל-**46 תבניות** עם exercises, warmup, cooldown

### 9. שדרוג UI מלא - Dark Mode 2026
**תאריך:** 2026-02-14

**עיצוב חדש:**
- **Dark Mode** מלא עם ערכת צבעים: ירוק (#00E676) על רקע כהה (#0D1117)
- **Glassmorphism** - כרטיסים שקופים עם backdrop-filter blur
- **אנימציות** - fadeIn, slideUp, glow על כרטיסים
- **Mobile-first** - responsive עם breakpoints ל-768px

**קבצים שהשתנו:**
- `.streamlit/config.toml` - ערכת צבעים כהה
- `styles.css` - **נכתב מחדש לחלוטין** (~730 שורות):
  - CSS Variables לכל הצבעים
  - `.glass-card` - כרטיס glassmorphism
  - `.exercise-card` - כרטיסי תרגילים **inline** (לא dropdown!)
  - `.exercise-card-img` - תמונות תרגילים מ-free-exercise-db
  - `.garmin-widget` + `.garmin-stats` - וידג'ט Garmin
  - `.coach-popup` - הודעה פרואקטיבית עם אנימציית glow
  - `.tag`, `.tag-blue`, `.tag-orange` - badges צבעוניים
  - כפתורי gradient ירוקים
  - Scrollbar כהה
- `muscles.py` - צבעים עודכנו ל-dark mode:
  - `_ACTIVE`: #4CAF50 → #00E676
  - `_BODY`: #D7CCC8 → #30363D
  - `_BODY_OUTLINE`: #8D6E63 → #484F58
  - `get_muscle_card_html()` - רקע כהה, borders כהים, glow ירוק בנבחר

**app.py - שינויים עיקריים:**
- **תרגילים מוצגים כ-inline cards** (לא expander/dropdown!) דרך `_build_exercise_cards_html()`
- כל כרטיס תרגיל כולל: מספר, תמונה מ-free-exercise-db, שם, sets×reps, זמן מנוחה
- חלוקה לסקציות: חימום (כתום), עיקריים, שחרור (כחול)
- `_calc_exercise_list_height()` - חישוב גובה דינמי ל-iframe
- גרף ההתקדמות עודכן לצבעים כהים
- Garmin widget בדשבורד
- הודעה פרואקטיבית מהקואצ' בדשבורד
- Garmin insight בדשבורד

### 10. אינטגרציית Garmin Connect
**תאריך:** 2026-02-14

**קובץ חדש: `garmin.py`**
- `get_garmin_data()` - מביא נתוני בריאות: Body Battery, שינה, סטרס, צעדים, דופק, קלוריות
- `render_garmin_widget_html()` - HTML widget עם 4 סטטיסטיקות צבעוניות
- `get_garmin_insight()` - תובנה בעברית לפי הנתונים
- `get_energy_suggestion()` - המלצת רמת אנרגיה לפי Garmin
- **Fallback לדמו** כשאין credentials (מציג נתונים לדוגמה)
- **חיבור:** צריך להוסיף `GARMIN_EMAIL` ו-`GARMIN_PASSWORD` ב-Streamlit Secrets

**`requirements.txt`** - נוסף `garminconnect>=0.2.0`

### 11. שדרוג קואצ' חכם
**תאריך:** 2026-02-14

**coach.py - שדרוגים:**
- **שכנוע (Persuasion):** כשמשתמש אומר "לא היום", הקואצ' מנסה לשכנע עד 2 פעמים
  - "מה דעתך על 10 דקות בלבד?"
  - "אפילו 5 מתיחות במקום יעשו פלאים"
  - אחרי 2 ניסיונות - מכבד את ההחלטה
- **הודעות פרואקטיביות** (`get_proactive_message()`):
  - לפי Garmin: Body Battery גבוה/נמוך, שינה גרועה, סטרס גבוה
  - לפי הקשר: לא התאמן היום, רצף בסכנה, אתמול היה אימון כבד
  - מוצגות כ-popup עם glow בדשבורד
- **מודעות לשרירים:** עוקב אחרי אילו שרירים עובדו השבוע, מציע להשלים חסרים
- **אינטגרציית Garmin:** `get_ai_suggestion()` מתחשב ב-Body Battery
  - BB >= 70 → מעלה אנרגיה ל-high
  - BB < 35 → מוריד ל-low
- **קואצ' בצ'אט:** ברכה כוללת Body Battery מ-Garmin

**app.py - שינויים לקואצ':**
- `coach_persuade_count` ב-session state
- כפתור "לא היום" מפעיל שכנוע לפני ויתור
- Garmin data מועבר ל-coach בכל מקום

## משימות בתור (לפי סדר מומלץ)
1. ~~יצירת JSON תרגילים מפורט ותבניות אימון~~ ✅ הושלם
2. ~~שדרוג הקואצ' - שיח חכם ופרואקטיבי + Garmin~~ ✅ הושלם
3. ~~תמונות תרגילים מ-free-exercise-db~~ ✅ הושלם (משולבות בכרטיסי תרגילים)
4. ~~מתיחת פנים לאפליקציה - עיצוב 2026~~ ✅ הושלם (Dark Mode + Glassmorphism)
5. ~~אינטגרציית Garmin Connect~~ ✅ הושלם (עם fallback לדמו)

## בעיות פתוחות
- אין חיבור ל-Supabase (רץ במצב דמו)
- Garmin רץ בדמו - צריך להוסיף GARMIN_EMAIL + GARMIN_PASSWORD ב-Secrets
- לבדוק שתמונות התרגילים מ-free-exercise-db נטענות (תלוי ב-GitHub raw URLs)
- לבדוק שה-dark mode מרונדר נכון בכל הדפדפנים

## מבנה הפרויקט
| קובץ | תפקיד |
|---|---|
| `app.py` | אפליקציה ראשית - UI, ניווט, 4 דפים, exercise cards, Garmin widget |
| `config.py` | קבועים - סוגי אימונים, שרירים, מיקומים |
| `database.py` | שכבת נתונים - Supabase / מצב דמו |
| `coach.py` | קואצ' חכם - שכנוע, פרואקטיבי, Garmin-aware, מודע לשרירים |
| `garmin.py` | אינטגרציית Garmin Connect - Body Battery, שינה, סטרס, צעדים |
| `muscles.py` | איורי SVG של קבוצות שרירים (dark mode) |
| `templates_data.py` | 46 תבניות אימון עם תרגילים מפורטים |
| `exercises_db.json` | מאגר 120 תרגילים (JSON) |
| `exercises_data.py` | מודול טעינה וחיפוש תרגילים + URLs לתמונות |
| `styles.css` | עיצוב CSS - Dark Mode, Glassmorphism, RTL, mobile-first |
| `schema.sql` | סכמת DB ל-Supabase |
