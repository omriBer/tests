#!/usr/bin/env python3
"""
HolmesPlace / Fizikal - כלי הזמנת חוגים אוטומטי
=================================================
הרץ סקריפט זה כ-cron job כדי להירשם לחוגים אוטומטית.

שימוש:
    python booker.py                    # הרץ פעם אחת
    python booker.py --dry-run          # סימולציה (ללא הרשמה אמיתית)
    python booker.py --discover-api     # גלה endpoints של ה-API
    python booker.py --date 2025-05-15  # הרשם לתאריך ספציפי
    python booker.py --daemon           # הרץ כ-daemon (לא נחוץ עם cron)

הגדרת cron:
    # פתח crontab:
    crontab -e
    # הוסף שורה (הרץ כל יום ב-07:05):
    5 7 * * * cd /path/to/holmesplace && python booker.py >> logs/booker.log 2>&1
"""

import argparse
import asyncio
import json
import logging
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import yaml

from fizikal_client import FizikalClient, FizikalAuthError, FizikalAPIError

# ─── Logging ──────────────────────────────────────────────────────────────────


def setup_logging(log_file: str = None, verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    handlers = [logging.StreamHandler(sys.stdout)]
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
    )


logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────

HEBREW_DAYS = {
    "ראשון": 6,   # Sunday (Python weekday: 6)
    "שני": 0,     # Monday
    "שלישי": 1,   # Tuesday
    "רביעי": 2,   # Wednesday
    "חמישי": 3,   # Thursday
    "שישי": 4,    # Friday
    "שבת": 5,     # Saturday
}

ENGLISH_DAYS = {v: k for k, v in HEBREW_DAYS.items()}


def load_config(config_path: str = "config.yaml") -> dict:
    path = Path(config_path)
    if not path.exists():
        logger.error(f"קובץ הגדרות לא נמצא: {config_path}")
        logger.error("העתק את config.yaml.example ל-config.yaml וערוך אותו")
        sys.exit(1)

    with open(path, encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # ולידציה בסיסית
    if not config.get("credentials"):
        logger.error("חסרים פרטי כניסה ב-config.yaml")
        sys.exit(1)

    phone = config["credentials"].get("phone", "")
    email = config["credentials"].get("email", "")
    if not phone and not email:
        logger.error("חובה להגדיר phone או email ב-config.yaml")
        sys.exit(1)

    return config


# ─── Preference Matching ──────────────────────────────────────────────────────


def get_target_date(config: dict, days_ahead: int = None) -> date:
    """חשב את התאריך היעד להרשמה"""
    if days_ahead is None:
        days_ahead = config.get("schedule", {}).get("book_days_ahead", 1)
    return date.today() + timedelta(days=days_ahead)


def get_day_name_hebrew(d: date) -> str:
    """החזר שם יום בעברית"""
    return ENGLISH_DAYS.get(d.weekday(), "")


def is_class_matching_preference(class_info: dict, pref: dict, target_date: date) -> bool:
    """
    בדוק אם חוג מתאים להעדפה.
    מחזיר True אם כל התנאים מתקיימים.
    """
    class_name = class_info.get("name", "").strip()
    pref_name = pref.get("name", "").strip()

    # בדוק שם חוג (חיפוש חלקי)
    if pref_name and pref_name not in class_name:
        return False

    # בדוק יום בשבוע
    pref_days = pref.get("days", [])
    if pref_days:
        day_name = get_day_name_hebrew(target_date)
        if day_name not in pref_days:
            return False

    # בדוק שעה
    start_time_str = class_info.get("start_time", "")
    if start_time_str:
        try:
            class_hour = datetime.strptime(start_time_str, "%H:%M").time()
            if pref.get("time_from"):
                from_time = datetime.strptime(pref["time_from"], "%H:%M").time()
                if class_hour < from_time:
                    return False
            if pref.get("time_to"):
                to_time = datetime.strptime(pref["time_to"], "%H:%M").time()
                if class_hour > to_time:
                    return False
        except ValueError:
            pass  # שעה לא בפורמט תקין - התעלם

    # בדוק מדריך
    pref_instructor = pref.get("instructor")
    if pref_instructor:
        class_instructor = class_info.get("instructor", "")
        if pref_instructor not in class_instructor:
            return False

    return True


def prioritize_classes(classes: list[dict], preferences: list[dict], target_date: date) -> list[tuple]:
    """
    מצא חוגים תואמים ומיין לפי עדיפות.
    מחזיר: רשימת (class_info, preference, priority_index)
    """
    matches = []
    for pref_idx, pref in enumerate(preferences):
        for cls in classes:
            if is_class_matching_preference(cls, pref, target_date):
                if cls.get("is_bookable", True):  # ברירת מחדל: ניתן להזמין
                    matches.append((cls, pref, pref_idx))

    # מיין לפי עדיפות (index נמוך = עדיפות גבוהה), ואז לפי שעה
    matches.sort(key=lambda x: (x[2], x[0].get("start_time", "")))
    return matches


# ─── Notifications ────────────────────────────────────────────────────────────


async def send_notification(config: dict, message: str):
    """שלח התראה (Telegram)"""
    notif = config.get("notifications", {})
    if not notif.get("enabled"):
        return

    bot_token = notif.get("telegram_bot_token", "")
    chat_id = notif.get("telegram_chat_id", "")

    if bot_token and chat_id:
        try:
            import httpx
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {"chat_id": chat_id, "text": message, "parse_mode": "HTML"}
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=10)
                if resp.status_code == 200:
                    logger.info("התראת Telegram נשלחה")
                else:
                    logger.warning(f"שגיאה בשליחת Telegram: {resp.status_code}")
        except Exception as e:
            logger.warning(f"לא ניתן לשלוח התראה: {e}")


# ─── Main Booking Flow ────────────────────────────────────────────────────────


async def run_booking(
    config: dict,
    target_date: date,
    dry_run: bool = False,
    discover_api: bool = False,
):
    """
    הזרימה הראשית של ההרשמה.
    """
    day_name = get_day_name_hebrew(target_date)
    logger.info(f"{'=' * 50}")
    logger.info(f"הרצת הרשמה לתאריך: {target_date} ({day_name})")
    if dry_run:
        logger.info("[DRY RUN] - לא יבוצעו הרשמות אמיתיות")

    booked = []
    skipped = []
    failed = []

    async with FizikalClient(config) as client:
        # שלב 1: כניסה
        try:
            await client.login()
        except FizikalAuthError as e:
            logger.error(f"שגיאת כניסה: {e}")
            await send_notification(config, f"❌ שגיאת כניסה להולמס פלייס: {e}")
            return

        # שלב 2: גלה API endpoints (אופציונלי)
        if discover_api:
            logger.info("מגלה API endpoints...")
            await client._page.goto("https://app.fizikal.co.il/schedule", wait_until="networkidle")
            import asyncio
            await asyncio.sleep(5)
            apis = client.get_intercepted_apis()
            logger.info(f"נמצאו {len(apis)} API endpoints:")
            for url, info in apis.items():
                logger.info(f"  {url}: {info['status']}")
                logger.info(f"    Preview: {info['body_preview'][:100]}")
            await client.take_screenshot("api_discovery.png")
            return

        # שלב 3: טען לוח חוגים
        classes = await client.get_schedule(target_date.isoformat())
        if not classes:
            msg = f"לא נמצאו חוגים לתאריך {target_date}"
            logger.warning(msg)
            await send_notification(config, f"⚠️ {msg}")
            await client.take_screenshot(f"no_classes_{target_date}.png")
            return

        logger.info(f"נמצאו {len(classes)} חוגים:")
        for cls in classes:
            logger.info(
                f"  - {cls.get('name', '?')} | "
                f"{cls.get('start_time', '?')} | "
                f"מדריך: {cls.get('instructor', '?')} | "
                f"ניתן להרשמה: {cls.get('is_bookable', '?')}"
            )

        # שלב 4: מצא חוגים תואמים
        preferences = config.get("preferences", [])
        if not preferences:
            logger.warning("לא הוגדרו העדפות ב-config.yaml")
            return

        matches = prioritize_classes(classes, preferences, target_date)

        if not matches:
            msg = f"לא נמצאו חוגים תואמים להעדפות ב-{target_date} ({day_name})"
            logger.info(msg)
            await send_notification(config, f"ℹ️ {msg}")
            return

        logger.info(f"נמצאו {len(matches)} חוגים תואמים:")
        for cls, pref, pref_idx in matches:
            logger.info(
                f"  [{pref_idx + 1}] {cls.get('name')} "
                f"({cls.get('start_time')}) - "
                f"העדפה: {pref.get('name')}"
            )

        # שלב 5: הרשמה
        weekly_counts: dict[str, int] = {}  # מעקב הרשמות שבועיות

        for cls, pref, pref_idx in matches:
            pref_name = pref.get("name", "")
            max_per_week = pref.get("max_bookings_per_week", 99)

            # בדוק מגבלה שבועית
            if weekly_counts.get(pref_name, 0) >= max_per_week:
                logger.info(f"הגעת למכסה השבועית עבור {pref_name}")
                skipped.append(cls)
                continue

            class_label = f"{cls.get('name')} ({cls.get('start_time')})"

            if dry_run:
                logger.info(f"[DRY RUN] היה מבצע הרשמה ל: {class_label}")
                booked.append(cls)
                weekly_counts[pref_name] = weekly_counts.get(pref_name, 0) + 1
                continue

            # הרשמה אמיתית
            for attempt in range(config.get("advanced", {}).get("max_retries", 3)):
                try:
                    success = await client.book_class(cls)
                    if success:
                        logger.info(f"✅ נרשמת ל: {class_label}")
                        booked.append(cls)
                        weekly_counts[pref_name] = weekly_counts.get(pref_name, 0) + 1
                        break
                    else:
                        logger.warning(f"הרשמה נכשלה (ניסיון {attempt + 1}): {class_label}")
                        if attempt < 2:
                            await asyncio.sleep(3 * (attempt + 1))
                except Exception as e:
                    logger.error(f"שגיאה בהרשמה (ניסיון {attempt + 1}): {e}")
                    if attempt < 2:
                        await asyncio.sleep(3 * (attempt + 1))
            else:
                failed.append(cls)

        # שלב 6: סיכום + התראה
        await client.take_screenshot(f"result_{target_date}.png")

        summary_lines = [f"📅 <b>סיכום הרשמות {target_date}</b>"]
        if booked:
            summary_lines.append("\n✅ <b>נרשמת בהצלחה:</b>")
            for cls in booked:
                summary_lines.append(
                    f"  • {cls.get('name')} {cls.get('start_time')}"
                )
        if failed:
            summary_lines.append("\n❌ <b>כשלו:</b>")
            for cls in failed:
                summary_lines.append(f"  • {cls.get('name')} {cls.get('start_time')}")
        if skipped:
            summary_lines.append(f"\n⏭ דולגו: {len(skipped)}")

        summary = "\n".join(summary_lines)
        logger.info(summary.replace("<b>", "").replace("</b>", ""))
        await send_notification(config, summary)


# ─── CLI ──────────────────────────────────────────────────────────────────────


def parse_args():
    parser = argparse.ArgumentParser(
        description="HolmesPlace / Fizikal - כלי הרשמה אוטומטי לחוגים",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--config", default="config.yaml", help="נתיב לקובץ הגדרות (ברירת מחדל: config.yaml)"
    )
    parser.add_argument(
        "--date",
        help="תאריך יעד לרישום YYYY-MM-DD (ברירת מחדל: מחר)",
        default=None,
    )
    parser.add_argument(
        "--days-ahead",
        type=int,
        default=None,
        help="כמה ימים קדימה לרשום (עוקף את הגדרת book_days_ahead)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="הרץ ללא ביצוע הרשמה אמיתית - מציג מה היה קורה",
    )
    parser.add_argument(
        "--discover-api",
        action="store_true",
        help="גלה את endpoints של ה-API (לפיתוח)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="הצג לוגים מפורטים"
    )
    parser.add_argument(
        "--list-classes",
        action="store_true",
        help="הצג בלבד את החוגים הזמינים ללא הרשמה",
    )
    return parser.parse_args()


async def main():
    args = parse_args()
    config = load_config(args.config)

    log_file = config.get("advanced", {}).get("log_file", "holmesplace_booker.log")
    setup_logging(log_file=log_file, verbose=args.verbose)

    logger.info("HolmesPlace Booker מופעל")

    # קבע תאריך יעד
    if args.date:
        try:
            target_date = date.fromisoformat(args.date)
        except ValueError:
            logger.error(f"תאריך לא תקין: {args.date} (נדרש YYYY-MM-DD)")
            sys.exit(1)
    else:
        target_date = get_target_date(config, args.days_ahead)

    if args.list_classes:
        # רק הצג חוגים
        async with FizikalClient(config) as client:
            await client.login()
            classes = await client.get_schedule(target_date.isoformat())
            print(f"\n חוגים לתאריך {target_date}:")
            print("-" * 60)
            for cls in classes:
                print(
                    f"  {cls.get('start_time', '?'):5s} | "
                    f"{cls.get('name', '?'):20s} | "
                    f"מדריך: {cls.get('instructor', '?'):15s} | "
                    f"{'✅ פנוי' if cls.get('is_bookable') else '❌ מלא'}"
                )
        return

    await run_booking(
        config=config,
        target_date=target_date,
        dry_run=args.dry_run,
        discover_api=args.discover_api,
    )


if __name__ == "__main__":
    asyncio.run(main())
