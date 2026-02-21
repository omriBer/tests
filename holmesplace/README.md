# HolmesPlace Auto-Booker

כלי אוטומציה להרשמה לחוגים ב-HolmesPlace דרך מערכת Fizikal.

## איך עובד

הכלי מריץ דפדפן headless שמתחבר ל-`app.fizikal.co.il`, מושך את לוח החוגים ומרשים אוטומטית לחוגים המועדפים שהגדרת.

### ארכיטקטורה

```
booker.py          ← כניסת CLI, לוגיקת התאמה לפי העדפות
fizikal_client.py  ← גישה ל-API / אוטומציה דרך Playwright
config.yaml        ← הגדרות אישיות
```

### תהליך

1. **כניסה** – טלפון + OTP (או אימייל + סיסמה)
2. **שמירת session** – ה-session נשמר ב-`.fizikal_session.json` כדי לא להתחבר מחדש בכל הרצה
3. **שליפת לוח חוגים** – ניסיון API ישיר, fallback לפרסור HTML
4. **התאמה** – מסנן חוגים לפי שם / יום / שעה / מדריך (לפי הגדרות config)
5. **הרשמה** – לפי סדר עדיפות; ניסיון API ישיר, fallback לקליק בדפדפן
6. **התראה** – Telegram (אופציונלי)

---

## התקנה

```bash
# 1. שכפל / הורד את הקבצים
cd holmesplace/

# 2. התקן תלויות
pip install -r requirements.txt

# 3. התקן דפדפן Chromium של Playwright
playwright install chromium

# 4. הגדר את config.yaml
cp config.yaml config.yaml   # ערוך עם פרטיך
```

---

## הגדרת config.yaml

```yaml
credentials:
  phone: "+972501234567"   # מספר הטלפון שרשמת באפליקציה

preferences:
  - name: "ספינינג"
    days: ["שני", "רביעי"]
    time_from: "18:00"
    time_to: "20:00"
    max_bookings_per_week: 2

  - name: "יוגה"
    days: ["שלישי"]
    time_from: "09:00"
    time_to: "11:00"
```

**שמות ימים תקינים:** `ראשון` `שני` `שלישי` `רביעי` `חמישי` `שישי` `שבת`

---

## הרצה ידנית

```bash
# הרצה מלאה (הרשמה ליום מחר)
python booker.py

# הצג בלבד חוגים זמינים (ללא הרשמה)
python booker.py --list-classes

# בדיקה - הצג מה היה קורה ללא הרשמה אמיתית
python booker.py --dry-run

# הרשמה לתאריך ספציפי
python booker.py --date 2025-05-15

# גלה endpoints של ה-API (לפיתוח)
python booker.py --discover-api

# לוגים מפורטים
python booker.py --verbose
```

---

## הגדרת Cron (הרצה אוטומטית יומית)

```bash
# פתח את עורך ה-crontab
crontab -e

# הוסף שורה זו (הרץ כל יום ב-07:05 בבוקר)
5 7 * * * cd /home/user/holmesplace && /usr/bin/python3 booker.py >> logs/booker.log 2>&1
```

> **טיפ:** בדוק מתי בדיוק נפתחת ההרשמה ב-HolmesPlace והגדר את ה-cron להרות כמה דקות אחרי.

### מומלץ: systemd timer (יותר אמין מ-cron)

```ini
# /etc/systemd/system/holmesplace-booker.service
[Unit]
Description=HolmesPlace Auto Booker

[Service]
Type=oneshot
WorkingDirectory=/home/user/holmesplace
ExecStart=/usr/bin/python3 booker.py
User=user
```

```ini
# /etc/systemd/system/holmesplace-booker.timer
[Unit]
Description=Run HolmesPlace Booker daily

[Timer]
OnCalendar=*-*-* 07:05:00
Timezone=Asia/Jerusalem
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now holmesplace-booker.timer
```

---

## אימות OTP

בפעם הראשונה (ובכל פקיעת session), תקבל SMS לטלפון.

- **הרצה אינטראקטיבית:** הסקריפט ישאל אותך לקוד
- **הרצה אוטומטית (cron):** כתוב את קוד ה-OTP לקובץ `.otp_code` בתוך 60 שניות מרגע הרצת הסקריפט

```bash
# לאחר קבלת ה-SMS:
echo "1234" > /home/user/holmesplace/.otp_code
```

> לאחר session מוצלח ראשון, הסקריפט שומר cookies ב-`.fizikal_session.json` ולא יצטרך OTP בכל הרצה.

---

## התראות Telegram

```yaml
notifications:
  enabled: true
  telegram_bot_token: "1234567890:ABCdef..."
  telegram_chat_id: "123456789"
```

1. צור bot דרך [@BotFather](https://t.me/BotFather)
2. קבל את ה-token
3. שלח הודעה ל-bot כדי לאתחל, ואז מצא את chat_id דרך:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`

---

## פתרון בעיות

### הסקריפט לא מוצא חוגים
1. הרץ עם `--discover-api` לראות אילו endpoints קיימים
2. הרץ עם `--verbose` לפרטים
3. בדוק את ה-screenshot שנשמר (`result_*.png`)

### session פג
מחק את `.fizikal_session.json` והרץ מחדש באופן אינטראקטיבי:
```bash
rm .fizikal_session.json
python booker.py
```

### שדה OTP לא נמצא
האפליקציה עשויה לשנות ממשק. הרץ עם `headless: false` ב-config.yaml לראות מה קורה.

---

## הערות

- הכלי בנוי לאתר `app.fizikal.co.il` כפי שהוא ב-2025
- אם Fizikal משנים את הממשק, ייתכן שיש לעדכן selectors ב-`fizikal_client.py`
- `--discover-api` שומר screenshot ולוג של ה-API endpoints שנחשפו - שימושי לשדרוג לקריאות API ישירות
