"""
FitnessMate - Coach (Chatbot Logic)
Rule-based coach that guides users through workout logging with encouragement.
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


def get_workout_suggestion(energy_level: str):
    suggestions = SUGGESTIONS_BY_ENERGY.get(energy_level, SUGGESTIONS_BY_ENERGY["medium"])
    return random.choice(suggestions)


def get_template_suggestion(energy_level: str):
    return TEMPLATE_SUGGESTIONS_BY_ENERGY.get(energy_level, TEMPLATE_SUGGESTIONS_BY_ENERGY["medium"])


def get_post_workout_message(difficulty: int, feeling: str):
    base = random.choice(ENCOURAGEMENTS_POST_WORKOUT)
    if difficulty >= 8:
        extra = " אימון קשוח! 💪🔥"
    elif difficulty >= 5:
        extra = " אימון טוב!"
    else:
        extra = " התחלה טובה!"
    return base + extra


def get_streak_message(streak_days: int):
    if streak_days >= 7:
        return f"שבוע שלם! {streak_days} ימים ברצף! 🏆🔥"
    elif streak_days >= 3:
        return f"רצף של {streak_days} ימים! " + random.choice(ENCOURAGEMENTS_STREAK)
    elif streak_days >= 1:
        return f"יום {streak_days}! המשך ככה! 💪"
    return ""


def get_no_workout_message():
    return random.choice(ENCOURAGEMENTS_NO_WORKOUT)


def get_weekly_insight(week_workouts: list):
    count = len(week_workouts)
    if count == 0:
        return "השבוע עוד לא התאמנת. בוא נתחיל! 🚀"
    elif count <= 2:
        return f"השבוע {count} אימונים. עוד קצת ותגיע ל-3! 💪"
    elif count <= 4:
        return f"שבוע מצוין! {count} אימונים! 🌟"
    else:
        return f"שבוע מטורף! {count} אימונים! אתה מכונה! 🔥🏆"


def _get_exercise_names_for_template_id(template_id: str, limit: int = 3):
    """Get Hebrew exercise names for a template ID."""
    from templates_data import get_template_by_id
    template = get_template_by_id(template_id)
    if not template:
        return ""
    exercises = get_exercises_for_template(template)
    names = [ex["name"] for ex in exercises[:limit]]
    return ", ".join(names)


def get_ai_suggestion(week_workouts: list, energy_level: str = "medium"):
    """Generate a simple AI suggestion based on this week's workouts."""
    count = len(week_workouts)
    types_done = [w.get("workout_type", "") for w in week_workouts]
    locations_done = [w.get("location", "") for w in week_workouts]

    # Suggest variety
    if count == 0:
        suggestion = get_workout_suggestion(energy_level)
        template_id = random.choice(get_template_suggestion(energy_level))
        ex_names = _get_exercise_names_for_template_id(template_id)
        if ex_names:
            suggestion += f"\nכולל: {ex_names}"
        return suggestion, template_id

    # Check what's missing
    all_home = all(loc == "בבית" for loc in locations_done)
    all_outdoor = all(loc == "בחוץ" for loc in locations_done)
    has_strength = any(w.get("training_type") == "כוח" for w in week_workouts)
    has_cardio = any(w.get("training_type") == "סיבולת" for w in week_workouts)

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
    else:
        suggestion = get_workout_suggestion(energy_level)
        template_id = random.choice(get_template_suggestion(energy_level))

    ex_names = _get_exercise_names_for_template_id(template_id)
    if ex_names:
        suggestion += f"\nכולל: {ex_names}"

    return suggestion, template_id
