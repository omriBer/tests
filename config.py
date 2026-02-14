import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

WORKOUT_TYPES = [
    "אימון ביתי", "ריצה בחוץ", "חדר כושר",
    "משקולות", "כדורגל עם הבן", "אחר"
]

FEELINGS = ["אנרגיה", "כוח", "הרגעה", "שחרור", "משהו אחר"]

EQUIPMENT = ["משקולות", "מכשירים", "Bodyweight", "ריצה"]

MUSCLES = [
    "חזה", "גב", "כתפיים", "זרועות",
    "בטן", "רגליים", "גוף מלא"
]

LOCATIONS = ["בבית", "בחוץ", "חדר כושר"]

COMPANY = ["לבד", "חברים", "משפחה"]

ENERGY_LEVELS = {
    "high": {"label": "אנרגיה גבוהה", "emoji": "🔥"},
    "medium": {"label": "בינונית", "emoji": "💪"},
    "low": {"label": "נמוכה", "emoji": "🧘"},
}

GOAL_TYPES = {
    "weekly_workouts": {
        "label": "אימונים בשבוע",
        "icon": "🎯",
        "unit": "אימונים",
        "options": [2, 3, 4, 5, 6, 7],
        "default": 3,
    },
    "weekly_minutes": {
        "label": "דקות בשבוע",
        "icon": "⏱️",
        "unit": "דקות",
        "options": [60, 90, 120, 150, 180, 240],
        "default": 120,
    },
    "weekly_strength": {
        "label": "אימוני כוח בשבוע",
        "icon": "💪",
        "unit": "אימוני כוח",
        "options": [1, 2, 3, 4, 5],
        "default": 2,
    },
}
