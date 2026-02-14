# תחקיר מלא - 4 משימות FitnessMate

---

## משימה 1: החלפת איורי SVG בתמונות איכותיות

### מצב נוכחי
- איורי SVG פשוטים של גוף אדם עם הדגשת שרירים
- נוצרים ב-Python (inline SVG) בקובץ `muscles.py`
- בעיות רינדור ב-Streamlit Cloud

### אפשרויות תמונות/איורים

#### אפשרות א: ExerciseDB (מומלץ)
- **11,000+ תרגילים** עם GIF הדגמה לכל תרגיל
- תמונות איכותיות של ביצוע התרגיל
- **חינמי** (self-hosted), או דרך RapidAPI
- מקור: [ExerciseDB GitHub](https://github.com/ExerciseDB/exercisedb-api)

#### אפשרות ב: free-exercise-db
- **800+ תרגילים** עם תמונות (2 תמונות לכל תרגיל - התחלה וסיום)
- **Public Domain** - חינמי לחלוטין, ללא הגבלות
- תמונות מאוחסנות ב-GitHub, גישה ישירה דרך URL
- URL לתמונות: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/0.jpg`
- מקור: [free-exercise-db](https://github.com/yuhonas/free-exercise-db)

#### אפשרות ג: MuscleWiki
- **1,700+ תרגילים** עם **6,800+ וידאו**
- מפת שרירים אינטראקטיבית (בהשראה לעיצוב)
- API רשמי דרך RapidAPI + API לא רשמי חינמי
- מקור: [MuscleWiki](https://musclewiki.com/)

#### אפשרות ד: Workout API
- תמונות איכותיות, תיאורים, רב-שפתי
- חינמי עד מכסה מסוימת
- מקור: [workoutapi.com](https://workoutapi.com/)

### איפה Garmin נכנס
- שילוב תמונת פעילות מ-Garmin (GPS map של ריצה, למשל)
- הצגת נתוני דופק אמיתיים ליד תמונת התרגיל
- אייקון Garmin על אימונים שסונכרנו מהשעון

### המלצה
**free-exercise-db** כמקור ראשי (חינמי, Public Domain, JSON מוכן) + תמונות קבוצות שרירים מ-MuscleWiki להחלפת ה-SVG הנוכחי.

---

## משימה 2: שדרוג הקואצ' - שיח חכם ופרואקטיבי

### מצב נוכחי
- Rule-based בלבד (random.choice מרשימות קבועות)
- שיח קצר: שאלת אנרגיה > הצעה > כן/לא > סוף
- אם אומרים "לא" - הקואצ' מוותר מיד
- לא מתייחס להיסטוריה, לא פרואקטיבי

### שיפורים מתוכננים

#### א. שכנוע חכם (אם המשתמש אומר "לא")
```
נוכחי: "גם יום מנוחה חשוב! מחר נחזור חזק"
משודרג:
- "הבנתי. אבל שים לב - לא התאמנת כבר 3 ימים. גם 10 דקות מתיחות יעשו פלאים! מה אומר?"
- "בסדר! מה דעתך על הליכה קצרה של 15 דקות? זה כמעט לא מרגיש כמו אימון 😊"
- הצעת אלטרנטיבה קלה יותר (לא מוותר בקלות)
```

#### ב. התייחסות להיסטוריה
- "השבוע עשית 2 אימוני כוח ואף פעם לא קרדיו. מה דעתך על ריצה?"
- "האימון האחרון שלך היה לפני 5 ימים. בוא נשבור את ההפסקה!"
- "בשבוע שעבר עשית 4 אימונים - בוא נשמור על הקצב!"

#### ג. פרואקטיביות
- **בכניסה לאפליקציה:** הקואצ' קופץ עם הודעה מותאמת
- **אם לא התאמנת 3+ ימים:** popup עם עידוד
- **אחרי אימון:** סיכום + הצעה להמשך

#### ד. הצעת תרגילים ספציפיים
- במקום "מה דעתך על אימון כוח?" > "מה דעתך על 3 סטים של סקוואט + לאנג'ים + כפיפות בטן?"
- קישור ישיר לתבנית עם התרגילים המפורטים

### איפה Garmin נכנס
- **Body Battery במקום שאלת אנרגיה:** אם Body Battery > 70 > "יש לך אנרגיה מעולה! בוא ננצל את זה"
- **שינה:** "ישנת רק 5 שעות, בוא נעשה משהו קל היום"
- **סטרס:** אם רמת סטרס גבוהה > "יום לחוץ? יוגה תעזור!"
- **פעילות אוטומטית:** "ראיתי שכבר הלכת 8,000 צעדים! מה דעתך להשלים עם 15 דק' בטן?"
- **VO2 Max:** התאמת רמת קושי לפי רמת כושר אמיתית

### ארכיטקטורה מוצעת
```
coach.py (נוכחי) -> coach.py (משודרג)
├── get_proactive_message(user_history, garmin_data) - הודעה פרואקטיבית בכניסה
├── get_persuasion_message(user_history, energy) - שכנוע אם אמר "לא"
├── get_smart_suggestion(user_history, garmin_data) - הצעה מבוססת היסטוריה
├── get_workout_recap(workout) - סיכום אחרי אימון
└── should_show_popup(user_history) - האם להציג popup
```

---

## משימה 3: יצירת JSON תרגילים מפורט ותבניות אימון

### מצב נוכחי
- `templates_data.py` - 30 תבניות בסיסיות (שם, סוג, משך, מיקום)
- **אין תרגילים ספציפיים** בתוך התבניות
- אין מאגר תרגילים כלל

### מבנה JSON מוצע

#### exercises.json - מאגר תרגילים
```json
{
  "exercises": [
    {
      "id": "squat_bodyweight",
      "name_he": "סקוואט",
      "name_en": "Bodyweight Squat",
      "muscle_primary": "רגליים",
      "muscle_secondary": ["ישבן", "ליבה"],
      "equipment": "bodyweight",
      "location": ["בבית", "חדר כושר", "בחוץ"],
      "level": "beginner",
      "type": "כוח",
      "instructions_he": ["עמוד עם רגליים ברוחב כתפיים", "כופף ברכיים כאילו יושב על כיסא", "ירד עד שהירכיים מקבילות לרצפה", "חזור למעלה"],
      "sets_default": 3,
      "reps_default": 12,
      "image_url": "...",
      "video_url": "..."
    }
  ]
}
```

#### workout_templates.json - תבניות אימון עם תרגילים
```json
{
  "templates": [
    {
      "id": "home-legs-beginner",
      "name": "רגליים ביתי - מתחילים",
      "duration_minutes": 20,
      "location": "בבית",
      "equipment": ["bodyweight"],
      "muscle_focus": "רגליים",
      "level": "beginner",
      "exercises": [
        {"exercise_id": "squat_bodyweight", "sets": 3, "reps": 12, "rest_seconds": 60},
        {"exercise_id": "lunges", "sets": 3, "reps": 10, "rest_seconds": 60},
        {"exercise_id": "calf_raises", "sets": 3, "reps": 15, "rest_seconds": 45}
      ],
      "warmup": ["jumping_jacks", "leg_swings"],
      "cooldown": ["quad_stretch", "hamstring_stretch"]
    }
  ]
}
```

### קטגוריות נדרשות

#### לפי מיקום
- בבית (bodyweight / משקולות קטנות)
- חדר כושר (מכשירים + משקולות)
- בחוץ (ריצה, פארק, כדורגל)

#### לפי קבוצת שרירים
- חזה, גב, כתפיים, זרועות, בטן, רגליים, גוף מלא

#### לפי סוג אימון
- כוח, סיבולת, גמישות, HIIT

#### לפי חברה
- לבד, עם חברים, משפחה (כדורגל)

#### לפי רמה
- מתחיל, בינוני (לא מתקדם מדי)

### מקור נתונים
- **free-exercise-db** כבסיס (800+ תרגילים, Public Domain)
- סינון וקיצור ל-100-150 תרגילים רלוונטיים
- תרגום שמות לעברית
- יצירת 40-50 תבניות אימון מלאות

### איפה Garmin נכנס
- **סנכרון תבנית לשעון:** שליחת תוכנית אימון ל-Garmin דרך Training API
- **התאמת תבנית אוטומטית:** לפי VO2 Max (רמת כושר) ו-Body Battery (אנרגיה נוכחית)
- **ייבוא אימון מהשעון:** אימון שנעשה עם Garmin מתמפה אוטומטית לתבנית

---

## משימה 4: מתיחת פנים לאפליקציה - עיצוב 2026

### מצב נוכחי
- עיצוב פשוט, ירוק/כחול, כפתורי Streamlit רגילים
- נראה כמו prototype ולא כמו אפליקציה אמיתית
- חסר: Dark mode, אנימציות, כרטיסים מודרניים, אייקונים

### טרנדים 2025-2026

#### עיצוב ויזואלי
- **Glassmorphism:** רקעים שקופים עם blur (frosted glass)
- **Exaggerated Minimalism:** layout נקי עם אלמנטים בולטים
- **Dark Mode:** חובה באפליקציות כושר (Hevy, Strong כולם dark)
- **Gradient accents:** שיפועי צבע עדינים על כפתורים וכרטיסים
- **Micro-interactions:** אנימציות קטנות בלחיצה, גלילה, טעינה

#### פלטת צבעים מוצעת (Dark Mode)
```css
--bg-primary: #0D1117        /* רקע כהה */
--bg-card: #161B22           /* כרטיסים */
--bg-card-hover: #1C2333     /* כרטיס hover */
--accent-green: #00E676      /* ירוק ניאון - פעולות ראשיות */
--accent-blue: #448AFF       /* כחול - מידע */
--accent-orange: #FF9100     /* כתום - אזהרות/הישגים */
--text-primary: #E6EDF3      /* טקסט ראשי */
--text-secondary: #8B949E    /* טקסט משני */
--border: #30363D            /* גבולות */
```

#### רכיבי Streamlit מתקדמים
- **streamlit-shadcn-ui:** כפתורים, כרטיסים, badges מודרניים
- **st_yled:** Badge Cards, Image Cards, Sticky Header
- **Custom CSS:** glassmorphism, אנימציות, dark mode

### שינויים מתוכננים

#### ניווט
- נוכחי: 4 כפתורים בשורה
- חדש: Bottom navigation bar קבוע (כמו אפליקציה אמיתית)

#### דשבורד
- נוכחי: טקסט + גרף פשוט
- חדש: כרטיסי סטטיסטיקות (streak, אימונים השבוע, דופק), גרף מעוגל, Progress ring

#### כרטיסי אימון
- נוכחי: כרטיסים פשוטים עם טקסט
- חדש: תמונות, שיפועי צבע, אנימציית הופעה, badges (קושי, משך)

#### טיימר
- חסר לגמרי כרגע
- חדש: טיימר מנוחה בין סטים עם עיגול מתקדם

### איפה Garmin נכנס
- **ווידג'ט Garmin בדשבורד:** כרטיס עם צעדים, דופק, Body Battery, שינה
- **גרף משולב:** ציר זמן אחד עם נתוני Garmin + אימונים מהאפליקציה
- **עיצוב בהשראת Garmin Connect:** גרפים מעוגלים, צבעי אנרגיה (ירוק/כתום/אדום)
- **אייקון סנכרון:** סמל Garmin על אימונים שיובאו מהשעון
- **מסך Garmin ייעודי:** דף שמציג את כל הנתונים מהשעון במקום אחד

---

## סיכום תלויות בין משימות

```
משימה 3 (JSON תרגילים) ──> משימה 1 (תמונות - URL מה-JSON)
                        ──> משימה 2 (קואצ' - מציע תרגילים מה-JSON)

משימה 4 (עיצוב) ──> כל המשימות (העיצוב החדש חל על הכל)

Garmin ──> משימה 2 (הכי קריטי - Body Battery, היסטוריה)
       ──> משימה 4 (ווידג'ט בדשבורד)
       ──> משימה 3 (סנכרון תבניות לשעון)
```

### סדר ביצוע מומלץ
1. **משימה 3** - JSON תרגילים (בסיס לכל השאר)
2. **משימה 2** - קואצ' חכם (הכי משפיע על חוויית המשתמש)
3. **משימה 1** - תמונות (תלוי ב-JSON)
4. **משימה 4** - עיצוב (עוטף הכל)

---

*מקורות:*
- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) - מאגר תרגילים חינמי
- [ExerciseDB](https://github.com/ExerciseDB/exercisedb-api) - 11,000+ תרגילים
- [MuscleWiki](https://musclewiki.com/) - מפת שרירים + וידאו
- [garminconnect Python](https://github.com/cyberjunky/python-garminconnect) - ספריית Garmin
- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [streamlit-shadcn-ui](https://discuss.streamlit.io/t/new-component-streamlit-shadcn-ui/56390)
- [Streamlit Theming](https://docs.streamlit.io/develop/concepts/configuration/theming)
- [Fitness App UX 2025](https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/)
- [App Design Trends 2026](https://www.lyssna.com/blog/app-design-trends/)
