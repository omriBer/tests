"""
FitnessMate - Exercise Data Module
Loads exercises from JSON and provides search/filter functions.
"""

import json
import os

_EXERCISES_CACHE = None
_EXERCISES_BY_ID = None

EXERCISE_IMAGE_BASE_URL = (
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
)


def load_exercises():
    """Load all exercises from the JSON database."""
    global _EXERCISES_CACHE, _EXERCISES_BY_ID
    if _EXERCISES_CACHE is not None:
        return _EXERCISES_CACHE

    json_path = os.path.join(os.path.dirname(__file__), "exercises_db.json")
    with open(json_path, "r", encoding="utf-8") as f:
        _EXERCISES_CACHE = json.load(f)

    _EXERCISES_BY_ID = {ex["id"]: ex for ex in _EXERCISES_CACHE}
    return _EXERCISES_CACHE


def get_exercise(exercise_id):
    """Get a single exercise by ID. Returns None if not found."""
    load_exercises()
    return _EXERCISES_BY_ID.get(exercise_id)


def search_exercises(muscle=None, equipment=None, location=None, level=None,
                     exercise_type=None):
    """Search/filter exercises by criteria. All params are optional."""
    exercises = load_exercises()
    results = exercises

    if muscle:
        results = [e for e in results if e["muscle_primary"] == muscle]

    if equipment:
        results = [e for e in results if e["equipment"] == equipment]

    if location:
        results = [e for e in results if location in e["locations"]]

    if level:
        results = [e for e in results if e["level"] == level]

    if exercise_type:
        results = [e for e in results if e["type"] == exercise_type]

    return results


def get_exercises_for_template(template):
    """Get full exercise details for a template's exercise list.

    Returns a list of dicts with exercise details merged with
    the template's sets/reps/rest configuration.
    """
    load_exercises()
    result = []
    for ex_entry in template.get("exercises", []):
        exercise = get_exercise(ex_entry["exercise_id"])
        if exercise:
            merged = {
                **exercise,
                "sets": ex_entry.get("sets", exercise["sets_default"]),
                "reps": ex_entry.get("reps", exercise["reps_default"]),
                "rest_sec": ex_entry.get("rest_sec", 60),
            }
            result.append(merged)
    return result


def get_warmup_exercises(template):
    """Get full exercise details for a template's warmup list."""
    load_exercises()
    return [get_exercise(eid) for eid in template.get("warmup", [])
            if get_exercise(eid)]


def get_cooldown_exercises(template):
    """Get full exercise details for a template's cooldown list."""
    load_exercises()
    return [get_exercise(eid) for eid in template.get("cooldown", [])
            if get_exercise(eid)]


def get_exercise_image_url(exercise):
    """Get URL for exercise image from free-exercise-db.

    Returns a URL string or None if no image_id.
    """
    image_id = exercise.get("image_id")
    if not image_id:
        return None
    return f"{EXERCISE_IMAGE_BASE_URL}/{image_id}/0.jpg"


def get_exercise_gif_url(exercise):
    """Get URL for exercise GIF from free-exercise-db.

    Returns a URL string or None if no image_id.
    GIFs show animated exercise demonstration.
    """
    image_id = exercise.get("image_id")
    if not image_id:
        return None
    # free-exercise-db stores GIFs as 0.gif alongside the jpg
    return f"{EXERCISE_IMAGE_BASE_URL}/{image_id}/0.gif"


# DO/DON'T tips for common exercises (Hebrew)
EXERCISE_TIPS = {
    "pushup_standard": {
        "do": "שמור על גוף ישר כמו קרש",
        "dont": "אל תרשה לירכיים לצנוח",
    },
    "squat_bodyweight": {
        "do": "ברכיים בכיוון האצבעות",
        "dont": "אל תרים את העקבים מהרצפה",
    },
    "plank": {
        "do": "כווץ בטן ושמור נשימה יציבה",
        "dont": "אל תרים את הישבן למעלה",
    },
    "lunges": {
        "do": "ברך אחורית כמעט נוגעת ברצפה",
        "dont": "אל תדחוף ברך קדמית מעבר לאצבעות",
    },
    "crunch": {
        "do": "הרם כתפיים, לא צוואר",
        "dont": "אל תמשוך את הצוואר עם הידיים",
    },
    "mountain_climber": {
        "do": "שמור ידיים מתחת לכתפיים",
        "dont": "אל תרים את הישבן גבוה מדי",
    },
    "burpees": {
        "do": "תנועה רציפה ומבוקרת",
        "dont": "אל תדלג על השכיבת סמיכה",
    },
    "glute_bridge": {
        "do": "סחוט ישבן בנקודה העליונה",
        "dont": "אל תקשת את הגב התחתון",
    },
    "bicep_curl_dumbbell": {
        "do": "מרפקים צמודים לגוף",
        "dont": "אל תנדנד את הגוף לתנופה",
    },
    "bench_press_dumbbell": {
        "do": "כתפיים נעוצות בספסל",
        "dont": "אל תרים את הגב מהספסל",
    },
    "lat_pulldown": {
        "do": "משוך לכיוון החזה, לא מאחורי הצוואר",
        "dont": "אל תישען אחורה יותר מדי",
    },
    "shoulder_press_dumbbell": {
        "do": "דחוף ישר למעלה, לא קדימה",
        "dont": "אל תקשת את הגב",
    },
    "deadlift_dumbbell": {
        "do": "גב ישר, ירכיים דוחפות אחורה",
        "dont": "אל תעגל את הגב",
    },
    "russian_twist": {
        "do": "סובב את כל פלג הגוף העליון",
        "dont": "אל תזיז רק את הידיים",
    },
    "jump_squat": {
        "do": "נחות רך על כריות כפות הרגליים",
        "dont": "אל תנחת על ברכיים נעולות",
    },
}


def get_exercise_tips(exercise):
    """Get DO/DON'T tips for an exercise.

    Returns dict with 'do' and 'dont' keys, or None.
    """
    return EXERCISE_TIPS.get(exercise.get("id"))
