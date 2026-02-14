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

## בעיות פתוחות
- לבדוק שהאיורים מרונדרים נכון אחרי הדיפלוי האחרון (components.html)
- אין חיבור ל-Supabase (רץ במצב דמו)

## מבנה הפרויקט
| קובץ | תפקיד |
|---|---|
| `app.py` | אפליקציה ראשית - Streamlit UI, ניווט, 4 דפים |
| `config.py` | קבועים - סוגי אימונים, שרירים, מיקומים |
| `database.py` | שכבת נתונים - Supabase / מצב דמו |
| `coach.py` | לוגיקת קואצ' - הודעות, הצעות, תובנות |
| `muscles.py` | איורי SVG של קבוצות שרירים |
| `templates_data.py` | 30 תבניות אימון מוכנות |
| `schema.sql` | סכמת DB ל-Supabase |
| `styles.css` | עיצוב CSS - ירוק/כחול, RTL, mobile-first |
