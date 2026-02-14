"""
FitnessMate - Tinder-Gym Workout Matcher
State Machine: Context → Gear → Muscle Map → Workout Player → Summary
Zero forms. Visual selection. Instant workout.
"""

import random
import streamlit as st
import streamlit.components.v1 as components
from datetime import date

from config import MUSCLES
from database import (
    is_demo_mode, save_workout, get_week_workouts,
    sign_in, sign_up, get_current_user_id,
)
from templates_data import (
    TEMPLATES, CONTEXTS, GEARS, match_templates, get_template_by_id,
)
from exercises_data import (
    get_exercises_for_template, get_warmup_exercises,
    get_cooldown_exercises, get_exercise_image_url,
    get_exercise_gif_url, get_exercise_tips,
)
from coach import get_ghost_coach_message, get_weekly_insight
from muscles import get_muscle_svg, get_muscle_card_html
from garmin import get_garmin_data, render_garmin_widget_html, get_energy_suggestion

# ------------------------------------
# Page Config
# ------------------------------------
st.set_page_config(
    page_title="FitnessMate",
    page_icon="💪",
    layout="centered",
    initial_sidebar_state="collapsed",
)


# ------------------------------------
# Load Custom CSS
# ------------------------------------
def load_css():
    try:
        with open("styles.css", "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        pass


load_css()


def _css_text():
    try:
        with open("styles.css", "r") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def render_svg_html(html, height=200):
    """Render HTML containing SVG using components.html for reliable display."""
    css = _css_text()
    full = (
        f'<html><head><style>{css}</style></head>'
        f'<body style="margin:0;padding:0;direction:rtl;'
        f'font-family:Segoe UI,Tahoma,Arial,sans-serif;'
        f'background:transparent;">{html}</body></html>'
    )
    components.html(full, height=height, scrolling=False)


# ------------------------------------
# Session State Init
# ------------------------------------
def init_state():
    defaults = {
        # Auth
        "authenticated": False,
        "user_id": None,
        # State machine: context → gear → muscle → player → summary
        "tg_state": "context",
        "tg_context": None,
        "tg_gear": None,
        "tg_muscle": None,
        "tg_template": None,
        "tg_exercise_idx": 0,
        "tg_exercises": [],
        "tg_workout_done": False,
        # Garmin
        "garmin_data": None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


init_state()


# ------------------------------------
# Auth Page
# ------------------------------------
def render_auth():
    st.markdown(
        '<div class="app-header">'
        '<h1>💪 FitnessMate</h1>'
        '<p class="subtitle">Workout Matcher for Couch Potatoes</p>'
        "</div>",
        unsafe_allow_html=True,
    )

    if is_demo_mode():
        st.info("מצב דמו - הנתונים נשמרים בזיכרון בלבד")
        if st.button("התחל!", use_container_width=True, type="primary"):
            st.session_state.authenticated = True
            st.session_state.user_id = "demo-user"
            st.rerun()
        return

    tab_login, tab_signup = st.tabs(["כניסה", "הרשמה"])

    with tab_login:
        email = st.text_input("אימייל", key="login_email")
        password = st.text_input("סיסמה", type="password", key="login_password")
        if st.button("כניסה", use_container_width=True, type="primary"):
            try:
                res = sign_in(email, password)
                if res:
                    st.session_state.authenticated = True
                    st.session_state.user_id = get_current_user_id()
                    st.rerun()
            except Exception:
                st.error("שגיאה בכניסה. בדוק אימייל וסיסמה.")

    with tab_signup:
        name = st.text_input("שם", key="signup_name")
        email_s = st.text_input("אימייל", key="signup_email")
        password_s = st.text_input("סיסמה", type="password", key="signup_password")
        if st.button("הרשמה", use_container_width=True, type="primary"):
            try:
                res = sign_up(email_s, password_s, name)
                if res:
                    st.success("נרשמת בהצלחה! עכשיו תוכל להיכנס.")
            except Exception:
                st.error("שגיאה בהרשמה.")


# ------------------------------------
# Helper: Go back one state
# ------------------------------------
def _go_back():
    """Navigate back one step in the state machine."""
    state = st.session_state.tg_state
    if state == "gear":
        st.session_state.tg_state = "context"
        st.session_state.tg_context = None
    elif state == "muscle":
        st.session_state.tg_state = "gear"
        st.session_state.tg_gear = None
    elif state == "player":
        st.session_state.tg_state = "muscle"
        st.session_state.tg_muscle = None
        st.session_state.tg_template = None
        st.session_state.tg_exercises = []
        st.session_state.tg_exercise_idx = 0
    elif state == "summary":
        _reset_flow()


def _reset_flow():
    """Reset state machine to beginning."""
    st.session_state.tg_state = "context"
    st.session_state.tg_context = None
    st.session_state.tg_gear = None
    st.session_state.tg_muscle = None
    st.session_state.tg_template = None
    st.session_state.tg_exercises = []
    st.session_state.tg_exercise_idx = 0
    st.session_state.tg_workout_done = False


# ------------------------------------
# STATE 1: Context Selection
# ------------------------------------
def render_context_selection():
    st.markdown(
        '<div class="app-header">'
        '<h1>💪 FitnessMate</h1>'
        '<p class="subtitle">מה המצב?</p>'
        "</div>",
        unsafe_allow_html=True,
    )

    # Garmin widget (small, at top)
    garmin_data = get_garmin_data()
    st.session_state.garmin_data = garmin_data
    garmin_html = render_garmin_widget_html(garmin_data)
    st.markdown(garmin_html, unsafe_allow_html=True)

    # Determine if energy is low (for Garmin pulse glow)
    energy = get_energy_suggestion(garmin_data)
    low_energy = energy == "low"

    # Context cards - 2 columns grid using Streamlit buttons
    contexts = [
        ("microwave", "🍿", "Microwave Hero", "2 דקות בזמן המיקרו"),
        ("zoom", "💻", "Zoom-Proof Core", "בזמן ישיבה/עבודה"),
        ("kid", "👶", "Kid-Toss Cardio", "עם ילדים"),
        ("home", "🏠", "Home Workout", "אימון ביתי"),
        ("gym", "🏋️", "Gym Time", "חדר כושר"),
        ("outdoor", "🌳", "Outdoor", "בחוץ"),
    ]

    # Easy contexts that get glow when battery is low
    easy_contexts = {"microwave", "zoom"}

    for row_start in range(0, len(contexts), 2):
        cols = st.columns(2)
        for j, col in enumerate(cols):
            idx = row_start + j
            if idx >= len(contexts):
                break
            ctx_id, emoji, title, desc = contexts[idx]
            with col:
                # Show glow class hint for easy workouts when low energy
                glow_hint = " ✨" if low_energy and ctx_id in easy_contexts else ""
                if st.button(
                    f"{emoji}\n{title}{glow_hint}\n{desc}",
                    key=f"ctx_{ctx_id}",
                    use_container_width=True,
                ):
                    st.session_state.tg_context = ctx_id
                    st.session_state.tg_state = "gear"
                    st.rerun()

    # Weekly insight at bottom
    week_workouts = get_week_workouts(st.session_state.user_id)
    if week_workouts:
        insight = get_weekly_insight(week_workouts)
        st.markdown(
            f'<div class="glass-card" style="text-align:center;margin-top:1rem;">'
            f'{insight}</div>',
            unsafe_allow_html=True,
        )


# ------------------------------------
# STATE 2: Gear Selection
# ------------------------------------
def render_gear_selection():
    # Back button
    if st.button("← חזרה", key="back_gear"):
        _go_back()
        st.rerun()

    ctx = st.session_state.tg_context
    ctx_info = CONTEXTS.get(ctx, {})
    st.markdown(
        f'<h2 class="section-title">{ctx_info.get("label", "")} - מה יש לך?</h2>',
        unsafe_allow_html=True,
    )

    gears = [
        ("none", "✋", "Just Me", "בלי ציוד"),
        ("basic", "🎒", "Basic Gear", "משקולות קטנות / גומיות"),
        ("full", "🏋️", "Full Gym", "מכשירים מלאים"),
    ]

    # For microwave/zoom - skip gear (always "none") and go directly to muscle
    if ctx in ("microwave", "zoom"):
        st.session_state.tg_gear = "none"
        st.session_state.tg_state = "muscle"
        st.rerun()
        return

    for gear_id, emoji, title, desc in gears:
        if st.button(
            f"{emoji}  {title} - {desc}",
            key=f"gear_{gear_id}",
            use_container_width=True,
        ):
            st.session_state.tg_gear = gear_id
            st.session_state.tg_state = "muscle"
            st.rerun()


# ------------------------------------
# STATE 3: Muscle Map Selection
# ------------------------------------
def render_muscle_map():
    # Back button
    if st.button("← חזרה", key="back_muscle"):
        _go_back()
        st.rerun()

    st.markdown(
        '<h2 class="section-title">מה מאמנים?</h2>',
        unsafe_allow_html=True,
    )

    # Full body SVG preview
    svg_full = get_muscle_svg("גוף מלא", "כוח", size=120)
    render_svg_html(
        f'<div style="text-align:center">{svg_full}</div>',
        height=200,
    )

    # Quick action buttons
    quick_cols = st.columns(2)
    with quick_cols[0]:
        if st.button("🎯 גוף מלא", key="muscle_full",
                      use_container_width=True, type="primary"):
            _start_workout("גוף מלא")
            st.rerun()
    with quick_cols[1]:
        if st.button("🎲 הפתעה!", key="muscle_surprise",
                      use_container_width=True):
            _start_workout("הפתעה")
            st.rerun()

    st.markdown("---")

    # Individual muscle buttons with SVG
    muscles_list = ["חזה", "גב", "כתפיים", "זרועות", "בטן", "רגליים"]

    # Row of 3 + Row of 3
    row1 = muscles_list[:3]
    row2 = muscles_list[3:]

    cols1 = st.columns(3)
    for idx, muscle in enumerate(row1):
        with cols1[idx]:
            card_html = get_muscle_card_html(muscle, is_selected=False, size=55)
            render_svg_html(card_html, height=120)
            if st.button(
                muscle, key=f"muscle_{muscle}",
                use_container_width=True,
            ):
                _start_workout(muscle)
                st.rerun()

    cols2 = st.columns(3)
    for idx, muscle in enumerate(row2):
        with cols2[idx]:
            card_html = get_muscle_card_html(muscle, is_selected=False, size=55)
            render_svg_html(card_html, height=120)
            if st.button(
                muscle, key=f"muscle_{muscle}",
                use_container_width=True,
            ):
                _start_workout(muscle)
                st.rerun()


def _start_workout(muscle):
    """Match a workout template and start the player."""
    context = st.session_state.tg_context
    gear = st.session_state.tg_gear

    # Handle "surprise" - pick random muscle
    if muscle == "הפתעה":
        muscle = random.choice(["חזה", "גב", "כתפיים", "זרועות", "בטן", "רגליים", "גוף מלא"])

    st.session_state.tg_muscle = muscle

    # Match templates
    templates = match_templates(context=context, gear=gear, muscle=muscle)

    if not templates:
        # Fallback: try without muscle filter
        templates = match_templates(context=context, gear=gear)

    if not templates:
        # Ultimate fallback: any template for this context
        templates = match_templates(context=context)

    if not templates:
        # Last resort: any bodyweight home template
        templates = [t for t in TEMPLATES if t.get("gear") == "none"
                     and t.get("context") == "home"]

    if templates:
        template = random.choice(templates)
    else:
        template = TEMPLATES[0]  # Absolute fallback

    st.session_state.tg_template = template

    # Build exercise list
    exercises = get_exercises_for_template(template)
    st.session_state.tg_exercises = exercises
    st.session_state.tg_exercise_idx = 0
    st.session_state.tg_state = "player"


# ------------------------------------
# STATE 4: Workout Player
# ------------------------------------
def render_workout_player():
    template = st.session_state.tg_template
    exercises = st.session_state.tg_exercises
    current_idx = st.session_state.tg_exercise_idx

    if not template or not exercises:
        st.error("לא נמצא אימון מתאים")
        if st.button("חזרה להתחלה", use_container_width=True):
            _reset_flow()
            st.rerun()
        return

    total = len(exercises)
    current_ex = exercises[current_idx] if current_idx < total else None

    # Progress bar
    progress_pct = int((current_idx / total) * 100)
    st.markdown(
        f'<div class="player-progress-bar">'
        f'<div class="player-progress-fill" style="width:{progress_pct}%"></div>'
        f'</div>'
        f'<div class="player-exercise-counter" style="text-align:center;margin:0.3rem 0;">'
        f'{current_idx + 1} / {total}'
        f'</div>',
        unsafe_allow_html=True,
    )

    if current_ex is None:
        # All exercises done!
        _finish_workout()
        st.rerun()
        return

    # Template name
    st.markdown(
        f'<div style="text-align:center;color:#8B949E;font-size:0.85rem;margin-bottom:0.25rem;">'
        f'{template["emoji"]} {template["name"]}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # GIF / Image - the hero element
    gif_url = get_exercise_gif_url(current_ex)
    img_url = get_exercise_image_url(current_ex)
    display_url = gif_url or img_url

    if display_url:
        # Show the exercise GIF/image large
        render_svg_html(
            f'<div class="player-container">'
            f'<div class="player-gif-wrapper">'
            f'<img class="player-gif" src="{display_url}" '
            f'alt="{current_ex["name"]}" '
            f'onerror="this.parentElement.innerHTML='
            f'\'<div class=player-gif-placeholder>💪<span>{current_ex["name"]}</span></div>\'" />'
            f'<div class="player-hud-bottom">'
            f'<div class="player-exercise-name">{current_ex["name"]}</div>'
            f'<div class="player-exercise-detail">'
            f'{current_ex["sets"]}×{current_ex["reps"]}'
            f'</div>'
            f'</div>'
            f'</div>'
            f'</div>',
            height=380,
        )
    else:
        # No image - show exercise name large with muscle SVG
        muscle = current_ex.get("muscle_primary", st.session_state.tg_muscle)
        svg = get_muscle_svg(muscle, "כוח", size=100)
        render_svg_html(
            f'<div class="player-container">'
            f'<div class="player-gif-wrapper">'
            f'<div class="player-gif-placeholder">'
            f'{svg}'
            f'</div>'
            f'<div class="player-hud-bottom">'
            f'<div class="player-exercise-name">{current_ex["name"]}</div>'
            f'<div class="player-exercise-detail">'
            f'{current_ex["sets"]}×{current_ex["reps"]}'
            f'</div>'
            f'</div>'
            f'</div>'
            f'</div>',
            height=380,
        )

    # Sets x Reps display below image
    rest_text = f" · מנוחה {current_ex.get('rest_sec', 0)}ש׳" if current_ex.get("rest_sec", 0) > 0 else ""
    st.markdown(
        f'<div style="text-align:center;font-size:1.2rem;font-weight:700;color:#E6EDF3;margin:0.5rem 0;">'
        f'{current_ex["sets"]} סטים × {current_ex["reps"]} חזרות{rest_text}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # DO / DON'T tips
    tips = get_exercise_tips(current_ex)
    if tips:
        st.markdown(
            f'<div class="player-tips">'
            f'<div class="player-tip player-tip-do">'
            f'<span class="player-tip-label">✅ DO</span>{tips["do"]}'
            f'</div>'
            f'<div class="player-tip player-tip-dont">'
            f'<span class="player-tip-label">❌ DON\'T</span>{tips["dont"]}'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Navigation buttons
    st.markdown("")  # spacer
    nav_cols = st.columns([1, 3, 1])

    with nav_cols[0]:
        if current_idx > 0:
            if st.button("←", key="prev_ex"):
                st.session_state.tg_exercise_idx = current_idx - 1
                st.rerun()

    with nav_cols[1]:
        if current_idx < total - 1:
            btn_label = "הבא ←"
        else:
            btn_label = "סיים אימון! 🎉"

        if st.button(btn_label, key="next_ex",
                      use_container_width=True, type="primary"):
            if current_idx < total - 1:
                st.session_state.tg_exercise_idx = current_idx + 1
                st.rerun()
            else:
                _finish_workout()
                st.rerun()

    with nav_cols[2]:
        if st.button("✕", key="quit_workout"):
            _reset_flow()
            st.rerun()


def _finish_workout():
    """Auto-log the workout and go to summary."""
    template = st.session_state.tg_template
    exercises = st.session_state.tg_exercises

    # Auto-save workout (no form!)
    workout = {
        "workout_type": template.get("workout_type", "אחר"),
        "training_type": template.get("training_type", "כוח"),
        "target_muscle": st.session_state.tg_muscle,
        "duration_minutes": template.get("duration_minutes", 10),
        "difficulty": 5,
        "feeling": "אנרגיה",
        "equipment": template.get("equipment", []),
        "location": template.get("location", "בבית"),
        "company": "לבד",
        "template_id": template.get("id"),
    }
    save_workout(st.session_state.user_id, workout)

    st.session_state.tg_workout_done = True
    st.session_state.tg_state = "summary"


# ------------------------------------
# STATE 5: Summary (Ghost Coach)
# ------------------------------------
def render_summary():
    template = st.session_state.tg_template
    exercises = st.session_state.tg_exercises
    garmin_data = st.session_state.garmin_data
    context = st.session_state.tg_context
    muscle = st.session_state.tg_muscle

    # Done emoji
    st.markdown(
        '<div class="summary-container">'
        '<div class="summary-done-emoji">🎉</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<h2 class="section-title">סיימת!</h2>',
        unsafe_allow_html=True,
    )

    # Stats
    duration = template.get("duration_minutes", 0) if template else 0
    ex_count = len(exercises) if exercises else 0
    muscle_display = muscle if muscle else "גוף מלא"

    st.markdown(
        f'<div class="summary-stats">'
        f'<div class="summary-stat">'
        f'<div class="summary-stat-value">{ex_count}</div>'
        f'<div class="summary-stat-label">תרגילים</div>'
        f'</div>'
        f'<div class="summary-stat">'
        f'<div class="summary-stat-value">{duration}</div>'
        f'<div class="summary-stat-label">דקות</div>'
        f'</div>'
        f'<div class="summary-stat">'
        f'<div class="summary-stat-value">{muscle_display}</div>'
        f'<div class="summary-stat-label">קבוצת שריר</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Ghost Coach message
    coach_msg = get_ghost_coach_message(
        context=context,
        exercises_count=ex_count,
        duration=duration,
        muscle=muscle,
        garmin_data=garmin_data,
    )
    st.markdown(
        f'<div class="summary-coach-msg">🤖 {coach_msg}</div>',
        unsafe_allow_html=True,
    )

    # Streak counter
    week_workouts = get_week_workouts(st.session_state.user_id)
    workout_days = {w.get("workout_date") for w in week_workouts}
    streak = len(workout_days)
    if streak > 1:
        st.markdown(
            f'<div class="summary-streak">🔥 רצף: {streak} ימים השבוע!</div>',
            unsafe_allow_html=True,
        )

    # Weekly insight
    insight = get_weekly_insight(week_workouts)
    st.markdown(
        f'<div class="glass-card" style="text-align:center;">{insight}</div>',
        unsafe_allow_html=True,
    )

    # Action buttons
    st.markdown("")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("עוד אימון! 💪", key="another_workout",
                      use_container_width=True, type="primary"):
            _reset_flow()
            st.rerun()
    with col2:
        if st.button("סיימתי להיום ✌️", key="done_today",
                      use_container_width=True):
            _reset_flow()
            st.rerun()


# ------------------------------------
# Main App - State Machine Router
# ------------------------------------
def main():
    if not st.session_state.authenticated:
        render_auth()
        return

    state = st.session_state.tg_state

    if state == "context":
        render_context_selection()
    elif state == "gear":
        render_gear_selection()
    elif state == "muscle":
        render_muscle_map()
    elif state == "player":
        render_workout_player()
    elif state == "summary":
        render_summary()
    else:
        # Fallback
        _reset_flow()
        render_context_selection()


if __name__ == "__main__":
    main()
