"""
FitnessMate - Smart Coach
Proactive, persuasive, history-aware coach with Garmin integration.
"""

import random
from datetime import date, datetime
from exercises_data import get_exercises_for_template

GREETINGS = [
    "בוקר טוב! איך אתה מרגיש היום?",
    "היי! מוכן ליום פעיל?",
    "שלום! בוא נתחיל את היום בכוח!",
    "מה קורה? מוכן לזוז?",
]

ENCOURAGEMENTS_POST_WORKOUT = [
    "כל הכבוד! אימון נוסף בכיס! 💪",
    "מדהים! ההתמדה שלך מעוררת השראה! 🌟",
    "איזה יופי! הגוף שלך מודה לך! 🎉",
    "סחתיין! עוד יום של התקדמות! 🚀",
    "אלוף/ה! אתה בדרך הנכונה! ⭐",
    "עבודה מצוינת! מרגישים את ההתקדמות! 💯",
    "יש! עוד אימון מאחוריך! 🔥",
    "ברכות! ההשקעה שלך משתלמת! 🏆",
]

ENCOURAGEMENTS_STREAK = [
    "שמור על הקצב הזה! 🔥",
    "רצף מרשים! המשך ככה! 📈",
    "אתה על גל! אל תעצור! 🌊",
]

ENCOURAGEMENTS_NO_WORKOUT = [
    "גם יום מנוחה חשוב! מחר נחזור חזק 💚",
    "בסדר גמור! הגוף צריך לנוח. מחר? 🌱",
    "יום חופש? לגיטימי! תחזור כשתרגיש מוכן 😊",
]

# Persuasion messages when user says "no"
PERSUASION_MESSAGES = [
    "הבנתי... אבל מה דעתך על 10 דקות בלבד? זה כל מה שצריך כדי להרגיש טוב יותר! 🙏",
    "אוקיי, אבל תדע שגם 15 דקות הליכה יכולות לעשות הבדל ענק! מה אומר? 🚶",
    "שמע, אפילו 5 מתיחות קצרות במקום יעשו פלאים. רוצה לנסות? 🧘",
    "אני שומע אותך. מה דעתך לפחות על כמה דקות מתיחות לפני שינה? זה ממש עוזר 💤",
]

# Proactive messages based on context
PROACTIVE_MESSAGES = {
    "morning_no_workout": [
        "שם לב שעוד לא התאמנת היום. יום נפלא לזוז! 💚",
        "בוקר טוב! גוף שזז בבוקר מרגיש מדהים כל היום 🌅",
    ],
    "streak_risk": [
        "את/ה ברצף! אל תפסיק עכשיו, אפילו אימון קצר ישמור על הרצף 🔥",
        "הרצף שלך בסכנה! בוא נשמור עליו עם אימון קצר 💪",
    ],
    "rest_day_needed": [
        "אתמול היה אימון כבד. מה דעתך על משהו קל היום? 🧘",
        "שמתי לב שהגוף שלך עובד קשה. יום יוגה/מתיחות? 🙏",
    ],
    "garmin_high_battery": [
        "ה-Body Battery שלך גבוה! יום מושלם לאימון אינטנסיבי 🔋💪",
    ],
    "garmin_low_battery": [
        "ה-Body Battery שלך קצת נמוך. מה דעתך על הליכה קלה או יוגה? 🔋🧘",
    ],
    "garmin_poor_sleep": [
        "השינה לא הייתה מושלמת. אולי אימון קל שיעזור להירגע? 😴",
    ],
    "garmin_high_stress": [
        "רמת הסטרס גבוהה היום. אימון הוא אחד הדברים הטובים ביותר להורדת סטרס! 🧘",
    ],
}

SUGGESTIONS_BY_ENERGY = {
    "high": [
        "עם אנרגיה כזו, מה דעתך על אימון כוח? 💪",
        "יום מושלם לאינטרוולים! מה אומר? ⚡",
        "בוא ננצל את האנרגיה! אימון חדר כושר? 🏋️",
    ],
    "medium": [
        "מה דעתך על ריצה קלה? זה תמיד עובד! 🏃",
        "אימון ביתי קצר? 20 דקות ומרגישים מדהים! 🏠",
        "אולי כדורגל עם המשפחה? 😊 ⚽",
    ],
    "low": [
        "מה דעתך על יוגה? זה בדיוק מה שצריך 🧘",
        "הליכה קלה יכולה לעשות פלאים! 🚶",
        "15 דקות מתיחות? לפעמים זה כל מה שצריך 🤸",
    ],
}

TEMPLATE_SUGGESTIONS_BY_ENERGY = {
    "high": ["gym-full-45", "hiit-30", "run-intervals", "weights-30"],
    "medium": ["run-30", "home-strength-20", "football-30", "bike-30"],
    "low": ["yoga-20", "stretch-15", "walk-30", "yoga-30"],
}


def get_greeting():
    hour = datetime.now().hour
    if hour < 12:
        prefix = "בוקר טוב!"
    elif hour < 17:
        prefix = "צהריים טובים!"
    elif hour < 21:
        prefix = "ערב טוב!"
    else:
        prefix = "לילה טוב!"
    return f"{prefix} איך אתה מרגיש היום?"


def get_energy_question():
    return "איך רמת האנרגיה שלך?"


def get_workout_suggestion(energy_level):
    suggestions = SUGGESTIONS_BY_ENERGY.get(energy_level, SUGGESTIONS_BY_ENERGY["medium"])
    return random.choice(suggestions)


def get_template_suggestion(energy_level):
    return TEMPLATE_SUGGESTIONS_BY_ENERGY.get(energy_level, TEMPLATE_SUGGESTIONS_BY_ENERGY["medium"])


def get_post_workout_message(difficulty, feeling):
    base = random.choice(ENCOURAGEMENTS_POST_WORKOUT)
    if difficulty >= 8:
        extra = " אימון קשוח! 💪🔥"
    elif difficulty >= 5:
        extra = " אימון טוב!"
    else:
        extra = " התחלה טובה!"
    return base + extra


def get_streak_message(streak_days):
    if streak_days >= 7:
        return f"שבוע שלם! {streak_days} ימים ברצף! 🏆🔥"
    elif streak_days >= 3:
        return f"רצף של {streak_days} ימים! " + random.choice(ENCOURAGEMENTS_STREAK)
    elif streak_days >= 1:
        return f"יום {streak_days}! המשך ככה! 💪"
    return ""


def get_no_workout_message():
    return random.choice(ENCOURAGEMENTS_NO_WORKOUT)


def get_persuasion_message():
    """Get a persuasion message when user says no to working out."""
    return random.choice(PERSUASION_MESSAGES)


def get_proactive_message(week_workouts, garmin_data=None):
    """Generate a proactive coach message based on context."""
    hour = datetime.now().hour
    today_str = date.today().isoformat()
    trained_today = any(w.get("workout_date") == today_str for w in week_workouts)
    count = len(week_workouts)

    # Check Garmin data first
    if garmin_data and garmin_data.get("body_battery", 0) > 0:
        bb = garmin_data.get("body_battery", 50)
        stress = garmin_data.get("stress", 30)
        sleep = garmin_data.get("sleep_hours", 7)

        if not trained_today:
            if bb >= 70:
                return random.choice(PROACTIVE_MESSAGES["garmin_high_battery"])
            elif bb < 35:
                return random.choice(PROACTIVE_MESSAGES["garmin_low_battery"])

            if sleep < 6:
                return random.choice(PROACTIVE_MESSAGES["garmin_poor_sleep"])

            if stress >= 50:
                return random.choice(PROACTIVE_MESSAGES["garmin_high_stress"])

    # Non-Garmin proactive messages
    if not trained_today and hour >= 10 and hour <= 20:
        if count >= 3:
            return random.choice(PROACTIVE_MESSAGES["streak_risk"])
        return random.choice(PROACTIVE_MESSAGES["morning_no_workout"])

    # Check if yesterday was hard
    if week_workouts:
        yesterday = (date.today().replace(day=date.today().day)).isoformat()
        yesterday_workouts = [w for w in week_workouts
                              if w.get("workout_date") == yesterday]
        if yesterday_workouts:
            max_diff = max(w.get("difficulty", 5) for w in yesterday_workouts)
            if max_diff >= 8:
                return random.choice(PROACTIVE_MESSAGES["rest_day_needed"])

    return None


def get_weekly_insight(week_workouts):
    count = len(week_workouts)
    if count == 0:
        return "השבוע עוד לא התאמנת. בוא נתחיל! 🚀"
    elif count <= 2:
        return f"השבוע {count} אימונים. עוד קצת ותגיע ל-3! 💪"
    elif count <= 4:
        return f"שבוע מצוין! {count} אימונים! 🌟"
    else:
        return f"שבוע מטורף! {count} אימונים! אתה מכונה! 🔥🏆"


def _get_exercise_names_for_template_id(template_id, limit=3):
    """Get Hebrew exercise names for a template ID."""
    from templates_data import get_template_by_id
    template = get_template_by_id(template_id)
    if not template:
        return ""
    exercises = get_exercises_for_template(template)
    names = [ex["name"] for ex in exercises[:limit]]
    return ", ".join(names)


GHOST_COACH_MESSAGES = [
    "אלוף! עוד אימון בכיס. הגוף מודה לך!",
    "סגרת את זה! כל אימון מקרב אותך למטרה.",
    "מכונה! ההתמדה שלך מרשימה.",
    "נהדר! הגוף שלך כבר מרגיש את ההבדל.",
    "עבודה! עוד יום של גדילה.",
]

GHOST_COACH_BY_CONTEXT = {
    "microwave": "2 דקות שעשו את ההבדל! גם מיקרו-אימון סופר.",
    "zoom": "שברת את הישיבה! הגב והצוואר מודים לך.",
    "kid": "אימון משפחתי = דוגמה אישית מהטובות!",
    "home": "ביתי אבל אמיתי! כל הכבוד.",
    "gym": "חדר כושר ✓ עוד אימון מקצועי מאחוריך!",
    "outdoor": "אוויר צח + תנועה = השילוב המנצח!",
}


def get_ghost_coach_message(context=None, exercises_count=0, duration=0,
                            muscle=None, garmin_data=None):
    """Ghost Coach: one strong message after workout completion."""
    parts = []

    # Context-specific message
    if context and context in GHOST_COACH_BY_CONTEXT:
        parts.append(GHOST_COACH_BY_CONTEXT[context])
    else:
        parts.append(random.choice(GHOST_COACH_MESSAGES))

    # Stats line
    if exercises_count > 0 and duration > 0:
        muscle_text = f" | {muscle}" if muscle else ""
        parts.append(f"📊 {exercises_count} תרגילים · {duration} דק׳{muscle_text}")

    # Garmin insight (silent)
    if garmin_data and garmin_data.get("body_battery", 0) > 0:
        bb = garmin_data.get("body_battery", 50)
        if bb >= 60:
            parts.append("⌚ Body Battery גבוה - ניצלת את היום!")
        elif bb < 35:
            parts.append("⌚ אפילו עם Body Battery נמוך - התמדה!")

    return "\n".join(parts)



    """Generate a smart AI suggestion based on workouts, energy, and Garmin data."""
    count = len(week_workouts)
    types_done = [w.get("workout_type", "") for w in week_workouts]
    locations_done = [w.get("location", "") for w in week_workouts]

    # Adjust energy based on Garmin if available
    if garmin_data and garmin_data.get("body_battery", 0) > 0:
        bb = garmin_data.get("body_battery", 50)
        if bb >= 70 and energy_level != "low":
            energy_level = "high"
        elif bb < 35:
            energy_level = "low"

    # No workouts yet this week
    if count == 0:
        suggestion = get_workout_suggestion(energy_level)
        template_id = random.choice(get_template_suggestion(energy_level))
        ex_names = _get_exercise_names_for_template_id(template_id)
        if ex_names:
            suggestion += f"\nכולל: {ex_names}"
        return suggestion, template_id

    # Check what's missing for variety
    all_home = all(loc == "בבית" for loc in locations_done)
    all_outdoor = all(loc == "בחוץ" for loc in locations_done)
    has_strength = any(w.get("training_type") == "כוח" for w in week_workouts)
    has_cardio = any(w.get("training_type") == "סיבולת" for w in week_workouts)

    # Track muscles worked this week
    muscles_done = [w.get("target_muscle") for w in week_workouts if w.get("target_muscle")]
    muscles_missing = [m for m in ["חזה", "גב", "כתפיים", "זרועות", "בטן", "רגליים"]
                       if m not in muscles_done]

    if all_home and count >= 2:
        suggestion = "כל השבוע בבית - מה דעתך לצאת החוצה? ריצה או כדורגל? 🌳"
        template_id = "run-30"
    elif all_outdoor and count >= 2:
        suggestion = "הרבה פעילות בחוץ! אולי אימון כוח ביתי להשלמה? 🏠"
        template_id = "home-strength-20"
    elif has_strength and not has_cardio:
        suggestion = "השבוע הרבה כוח. מה דעתך על קצת קרדיו? 🫀"
        template_id = "run-20"
    elif has_cardio and not has_strength:
        suggestion = "הרבה סיבולת! בוא נוסיף קצת כוח לאיזון 💪"
        template_id = "home-strength-20"
    elif count >= 5:
        suggestion = "שבוע אינטנסיבי! אולי יום מתיחות קל? 🧘"
        template_id = "stretch-15"
    elif muscles_missing and has_strength:
        missing = muscles_missing[0]
        suggestion = f"עוד לא עבדת על {missing} השבוע. בוא נשלים! 💪"
        template_id = random.choice(get_template_suggestion(energy_level))
    else:
        suggestion = get_workout_suggestion(energy_level)
        template_id = random.choice(get_template_suggestion(energy_level))

    ex_names = _get_exercise_names_for_template_id(template_id)
    if ex_names:
        suggestion += f"\nכולל: {ex_names}"

    return suggestion, template_id
