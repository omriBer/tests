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

### 12. Tinder-Gym Overhaul
**תאריך:** 2026-02-14

**מקור דרישות:** `tasks.log.txt`

**מטרה:** הפיכת האפליקציה מטופס תיעוד ל-Workout Matcher בסגנון Tinder

**5 שלבי State Machine:**
1. **Context Selection** - כרטיסים ויזואליים: Microwave Hero, Zoom-Proof Core, Kid-Toss, Home, Gym, Outdoor
2. **Gear Selection** - Just Me / Basic Gear / Full Gym (דילוג אוטומטי ב-microwave/zoom)
3. **Muscle Map** - SVG אינטראקטיבי + כפתורי "גוף מלא" / "הפתעה"
4. **Workout Player** - GIF גדול + HUD overlays + DO/DON'T tips + ניווט הבא/קודם
5. **Summary** - Ghost Coach, סטטיסטיקות, streak counter, אימון נשמר אוטומטית

**עקרונות:**
- אפס טפסים, אפס text inputs, אפס sliders
- GIF hero (80% מהמסך) מ-free-exercise-db
- Ghost Coach - הודעה אחת חזקה בסוף אימון
- Silent Garmin - Body Battery נמוך → הכרטיסים הקלים מקבלים glow

**קבצים שהשתנו:**
- `app.py` - **נכתב מחדש לחלוטין** - State Machine עם 5 מצבים, הוסרו 4 דפים ישנים
- `styles.css` - **נכתב מחדש** - כרטיסי context/gear, player layout, DO/DON'T tips, summary screen
- `templates_data.py` - הוספת 10 micro-templates (microwave, zoom, kid), שדות context+gear ל-55 תבניות, CONTEXTS/GEARS dicts, match_templates()
- `exercises_data.py` - get_exercise_gif_url(), get_exercise_tips(), 15 DO/DON'T tips
- `coach.py` - get_ghost_coach_message(), הודעות לפי context

## משימות בתור (לפי סדר מומלץ)
1. ~~יצירת JSON תרגילים מפורט ותבניות אימון~~ ✅ הושלם
2. ~~שדרוג הקואצ' - שיח חכם ופרואקטיבי + Garmin~~ ✅ הושלם
3. ~~תמונות תרגילים מ-free-exercise-db~~ ✅ הושלם
4. ~~מתיחת פנים לאפליקציה - עיצוב 2026~~ ✅ הושלם
5. ~~אינטגרציית Garmin Connect~~ ✅ הושלם
6. ~~Tinder-Gym: Context/Gear/Muscle selection cards~~ ✅ הושלם
7. ~~Workout Player עם GIF + HUD + טיימר~~ ✅ הושלם
8. ~~Ghost Coach + Summary screen~~ ✅ הושלם
9. Silent Garmin - auto-highlight easy cards (בסיסי מומש, לשפר) ⏳

### 13. Next.js/React Rebuild
**תאריך:** 2026-02-14

**מטרה:** שכתוב מלא של האפליקציה מ-Streamlit (Python) ל-Next.js/React (TypeScript) עם דיפלוי על Vercel.

**Tech Stack:**
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Framer Motion (אנימציות)
- localStorage (אימונים, streaks)
- PWA (manifest.json + service worker)

**קבצים חדשים (Next.js):**
- `app/layout.tsx` - RTL Hebrew, Heebo font, dark theme #0D1117
- `app/page.tsx` - State machine: context→gear→muscle→player→summary
- `app/globals.css` - Tailwind + glassmorphism + neon animations
- `components/ContextCards.tsx` - 6 כרטיסי context עם Framer Motion + Garmin silent
- `components/GearCards.tsx` - 3 כרטיסי gear (דילוג אוטומטי ב-microwave/zoom)
- `components/MuscleMap.tsx` - SVG אינטראקטיבי עם neon glow + hover
- `components/WorkoutPlayer.tsx` - GIF hero + HUD overlays + DO/DON'T tips
- `components/CircleTimer.tsx` - טיימר עגול neon (60 שניות) + auto-advance
- `components/Summary.tsx` - סטטיסטיקות, streak, weekly insight
- `components/GhostCoach.tsx` - Toast overlay עם Framer Motion
- `lib/exercises.ts` - פורט מ-exercises_data.py
- `lib/templates.ts` - פורט מ-templates_data.py (46 תבניות)
- `lib/storage.ts` - localStorage wrapper
- `lib/garmin.ts` - Demo data + energy suggestion
- `lib/coach.ts` - Ghost Coach messages
- `public/data/exercises_db.json` - מועתק מהשורש
- `public/manifest.json` - PWA config
- `public/sw.js` - Service Worker (cache-first)

**Config files:**
- `package.json`, `tsconfig.json`, `next.config.js`, `postcss.config.mjs`, `eslint.config.mjs`

**קבצי Python ישנים נשארו בריפו** (לא נמחקו).

**Build:** `npm run build` עובר בהצלחה, 150kB First Load JS

### 14. מעקב שתיה - שיטה לפטינית
**תאריך:** 2026-03-13
**סטטוס:** ✅ הושלם

**מטרה:** אזור מעקב שתיה מלא עם אינטגרציית שיטה לפטינית (rules.json)

**קבצים חדשים:**
- `lib/waterStorage.ts` - localStorage wrapper: כוסות יומיות, pre-meal confirmations, חלון אכילה, שלב לפטיני
- `app/water/page.tsx` - עמוד שתיה מלא

**קבצים שישתנו:**
- `app/page.tsx` - הוספת WaterButton ליד MealsButton

**פיצ'רים לממש:**
1. ✅ מעקב כוסות יומי (יעד 2.5L = 10 כוסות)
2. ✅ מד ויזואלי (טיפות/כוסות)
3. ✅ אישור "שתיתי 2 כוסות לפני" לכל ארוחה (בוקר/צהריים/ערב) - כלל לפטיני מרכזי
4. ✅ מעקב חלון אכילה (8-12 שעות)
5. ✅ שלב לפטיני נוכחי (מחושב מתאריך התחלה)
6. ✅ כרטיס חוקי השלב הנוכחי

**מבנה נתונים (localStorage):**
- `fitnessmate_water` - WaterEntry[] עם timestamp, glasses, type
- `fitnessmate_leptin_start` - תאריך התחלת התוכנית
- `fitnessmate_eating_window` - { start: timestamp | null, durationHours: 10 }

---

## בעיות פתוחות
- PWA icons הם SVG placeholders (צריך להחליף ל-PNG אמיתיים)
- Garmin רץ בדמו (demo data only)
- לבדוק שה-GIFs מ-free-exercise-db נטענים (GitHub raw URLs)
- דיפלוי ל-Vercel (push to GitHub → auto-deploy)
- אזור תרגילים: חסר חיפוש חופשי (MuscleWiki style) - כרגע רק SVG אינטראקטיבי

## מבנה הפרויקט

### Next.js (חדש)
| קובץ | תפקיד |
|---|---|
| `app/page.tsx` | State Machine - Context→Gear→Muscle→Player→Summary |
| `components/ContextCards.tsx` | 6 כרטיסי בחירת context |
| `components/GearCards.tsx` | 3 כרטיסי בחירת ציוד |
| `components/MuscleMap.tsx` | SVG אינטראקטיבי לבחירת שריר |
| `components/WorkoutPlayer.tsx` | GIF hero + HUD + timer |
| `components/CircleTimer.tsx` | טיימר עגול neon |
| `components/Summary.tsx` | סיכום אימון |
| `components/GhostCoach.tsx` | Toast overlay |
| `lib/exercises.ts` | טעינת תרגילים + GIF URLs + tips |
| `lib/templates.ts` | 46 תבניות + matchTemplates() |
| `lib/storage.ts` | localStorage wrapper |
| `lib/garmin.ts` | Garmin demo data |
| `lib/coach.ts` | Ghost Coach messages |

### Streamlit (ישן - נשאר בריפו)
| קובץ | תפקיד |
|---|---|
| `app.py` | Streamlit State Machine (deprecated) |
| `config.py` | קבועים |
| `database.py` | שכבת נתונים Supabase/דמו |
| `coach.py` | קואצ' חכם (Python) |
| `garmin.py` | Garmin Connect (Python) |
| `muscles.py` | SVG paths (Python) |
| `templates_data.py` | תבניות אימון (Python) |
| `exercises_db.json` | מאגר 120 תרגילים |
| `exercises_data.py` | מודול תרגילים (Python) |
