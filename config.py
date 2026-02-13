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
