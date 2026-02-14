"""
FitnessMate - Main Streamlit Application
Fitness tracking app with minimal text input, touch-first design.
"""

import streamlit as st
from datetime import date, timedelta
import plotly.graph_objects as go

from config import (
    WORKOUT_TYPES, FEELINGS, EQUIPMENT, MUSCLES,
    LOCATIONS, COMPANY, ENERGY_LEVELS,
)
from database import (
    is_demo_mode, get_current_user_id, get_profile,
    save_workout, get_today_workouts, get_week_workouts,
    get_month_workouts, save_message, get_recent_messages,
    sign_in, sign_up,
)
from templates_data import TEMPLATES, get_template_by_id
from coach import (
    get_greeting, get_workout_suggestion, get_post_workout_message,
    get_streak_message, get_no_workout_message, get_weekly_insight,
    get_ai_suggestion, get_template_suggestion,
)
from muscles import (
    get_muscle_svg, get_muscle_card_html, get_workout_muscle_badge,
    get_template_muscle_svg,
)

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


# ------------------------------------
# Session State Init
# ------------------------------------
def init_state():
    defaults = {
        "page": "dashboard",
        "coach_step": "greeting",
        "coach_energy": None,
        "coach_messages": [],
        "selected_template": None,
        "workout_saved": False,
        "user_id": None,
        "authenticated": False,
        "selected_muscle": None,
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
        '<p class="subtitle">ניהול כושר חכם ופשוט</p>'
        "</div>",
        unsafe_allow_html=True,
    )

    if is_demo_mode():
        st.info("מצב דמו - הנתונים נשמרים בזיכרון בלבד")
        if st.button("התחל במצב דמו", use_container_width=True, type="primary"):
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
            except Exception as e:
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
            except Exception as e:
                st.error("שגיאה בהרשמה.")


# ------------------------------------
# Navigation
# ------------------------------------
def render_nav():
    cols = st.columns(4)
    pages = [
        ("dashboard", "📊", "דשבורד"),
        ("log", "➕", "אימון"),
        ("coach", "🤖", "קואצ׳"),
        ("templates", "📋", "תבניות"),
    ]
    for col, (page_id, icon, label) in zip(cols, pages):
        with col:
            btn_type = "primary" if st.session_state.page == page_id else "secondary"
            if st.button(f"{icon} {label}", key=f"nav_{page_id}",
                         use_container_width=True, type=btn_type):
                st.session_state.page = page_id
                st.rerun()


# ------------------------------------
# Dashboard
# ------------------------------------
def render_dashboard():
    user_id = st.session_state.user_id
    today_workouts = get_today_workouts(user_id)
    week_workouts = get_week_workouts(user_id)

    st.markdown('<h2 class="section-title">📊 הדשבורד שלך</h2>',
                unsafe_allow_html=True)

    # --- Today's Card with Muscle Image ---
    if today_workouts:
        w = today_workouts[0]
        muscle_badge = get_workout_muscle_badge(w, size=70)
        st.markdown(
            f'<div class="today-card done">'
            f'<div class="today-card-inner">'
            f'<div class="today-card-body">'
            f'{muscle_badge}'
            f'</div>'
            f'<div class="today-card-info">'
            f'<div class="today-status">✅ התאמנת היום!</div>'
            f'<div class="today-details">'
            f'<span class="tag">{w.get("workout_type", "")}</span>'
            f'<span class="tag">קושי {w.get("difficulty", "")}/10</span>'
            f'<span class="tag">{w.get("feeling", "")}</span>'
            f'</div></div></div></div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<div class="today-card pending">'
            '<div class="today-status">⏳ עדיין לא התאמנת היום</div>'
            '<div class="today-action">לחץ על ➕ להתחיל!</div>'
            "</div>",
            unsafe_allow_html=True,
        )

    # --- Weekly View ---
    st.markdown('<h3 class="section-subtitle">השבוע בקצרה</h3>',
                unsafe_allow_html=True)

    # Build a map: date -> workout for the week
    workout_by_date = {}
    for w in week_workouts:
        d = w.get("workout_date", "")
        if d not in workout_by_date:
            workout_by_date[d] = w

    week_cols = st.columns(7)
    day_names = ["ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳", "א׳"]

    for i in range(7):
        day = date.today() - timedelta(days=6 - i)
        day_str = day.isoformat()
        day_name = day_names[day.weekday()]
        w = workout_by_date.get(day_str)

        with week_cols[i]:
            if w:
                mini_svg = get_muscle_svg(
                    w.get("target_muscle"),
                    w.get("training_type", "כוח"),
                    size=32,
                )
                st.markdown(
                    f'<div class="week-day done">'
                    f'<div class="day-name">{day_name}</div>'
                    f'<div class="day-body">{mini_svg}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f'<div class="week-day empty">'
                    f'<div class="day-name">{day_name}</div>'
                    f'<div class="day-icon">⬜</div></div>',
                    unsafe_allow_html=True,
                )

    # --- Weekly Insight ---
    insight = get_weekly_insight(week_workouts)
    st.markdown(
        f'<div class="insight-card">{insight}</div>',
        unsafe_allow_html=True,
    )

    # --- AI Suggestion ---
    energy = st.session_state.get("coach_energy", "medium") or "medium"
    suggestion, template_id = get_ai_suggestion(week_workouts, energy)
    template = get_template_by_id(template_id)

    st.markdown('<h3 class="section-subtitle">💡 הצעה עבורך</h3>',
                unsafe_allow_html=True)

    if template:
        tmpl_svg = get_template_muscle_svg(template, size=60)
        st.markdown(
            f'<div class="suggestion-card">'
            f'<div class="suggestion-inner">'
            f'<div class="suggestion-body">{tmpl_svg}</div>'
            f'<div class="suggestion-text">{suggestion}</div>'
            f'</div></div>',
            unsafe_allow_html=True,
        )
        if st.button(
            f'{template["emoji"]} {template["name"]}',
            key="dash_suggestion_btn",
            use_container_width=True,
        ):
            st.session_state.selected_template = template
            st.session_state.page = "log"
            st.rerun()
    else:
        st.markdown(
            f'<div class="suggestion-card">{suggestion}</div>',
            unsafe_allow_html=True,
        )

    # --- Progress Chart ---
    month_workouts = get_month_workouts(user_id)
    if month_workouts:
        st.markdown('<h3 class="section-subtitle">📈 התקדמות (30 ימים)</h3>',
                    unsafe_allow_html=True)
        render_progress_chart(month_workouts)


def render_progress_chart(workouts):
    """Simple line chart of workouts per day over the last 30 days."""
    from collections import Counter

    dates_counter = Counter(w.get("workout_date", "") for w in workouts)

    chart_dates = []
    chart_counts = []
    for i in range(30):
        d = (date.today() - timedelta(days=29 - i)).isoformat()
        chart_dates.append(d)
        chart_counts.append(dates_counter.get(d, 0))

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=chart_dates,
        y=chart_counts,
        mode="lines+markers",
        line=dict(color="#4CAF50", width=3),
        marker=dict(size=8, color="#4CAF50"),
        fill="tozeroy",
        fillcolor="rgba(76, 175, 80, 0.1)",
    ))
    fig.update_layout(
        height=250,
        margin=dict(l=10, r=10, t=10, b=30),
        xaxis=dict(showgrid=False, tickformat="%d/%m"),
        yaxis=dict(showgrid=True, dtick=1, title=""),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig, use_container_width=True)


# ------------------------------------
# Visual Muscle Picker
# ------------------------------------
def render_muscle_picker(default_muscle: str | None = None):
    """Touch-friendly visual muscle group picker. Returns selected muscle."""
    current = st.session_state.get("selected_muscle", default_muscle)

    # Show the currently selected muscle prominently
    if current:
        svg_big = get_muscle_svg(current, "כוח", size=100)
        st.markdown(
            f'<div class="muscle-preview">'
            f'{svg_big}'
            f'<div class="muscle-preview-label">{current}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Grid of tappable muscle cards - 4 columns on top, 3 on bottom
    row1 = MUSCLES[:4]  # חזה, גב, כתפיים, זרועות
    row2 = MUSCLES[4:]  # בטן, רגליים, גוף מלא

    cols1 = st.columns(4)
    for idx, muscle in enumerate(row1):
        with cols1[idx]:
            is_sel = muscle == current
            card_html = get_muscle_card_html(muscle, is_selected=is_sel, size=55)
            st.markdown(card_html, unsafe_allow_html=True)
            if st.button(
                muscle, key=f"muscle_pick_{muscle}",
                use_container_width=True,
                type="primary" if is_sel else "secondary",
            ):
                st.session_state.selected_muscle = muscle
                st.rerun()

    cols2 = st.columns(3)
    for idx, muscle in enumerate(row2):
        with cols2[idx]:
            is_sel = muscle == current
            card_html = get_muscle_card_html(muscle, is_selected=is_sel, size=55)
            st.markdown(card_html, unsafe_allow_html=True)
            if st.button(
                muscle, key=f"muscle_pick_{muscle}",
                use_container_width=True,
                type="primary" if is_sel else "secondary",
            ):
                st.session_state.selected_muscle = muscle
                st.rerun()

    return st.session_state.get("selected_muscle", default_muscle)


# ------------------------------------
# Log Workout
# ------------------------------------
def render_log_workout():
    st.markdown('<h2 class="section-title">➕ רשום אימון</h2>',
                unsafe_allow_html=True)

    template = st.session_state.get("selected_template")

    # Pre-fill from template if selected
    default_type = WORKOUT_TYPES.index(template["workout_type"]) if template and template["workout_type"] in WORKOUT_TYPES else 0
    default_duration = template["duration_minutes"] if template else 30
    default_training = 0 if (template and template["training_type"] == "כוח") else 1 if template else 0
    default_location = LOCATIONS.index(template["location"]) if template and template["location"] in LOCATIONS else 0
    default_equipment = template["equipment"] if template else []

    if template:
        # Show template badge with muscle illustration
        tmpl_svg = get_template_muscle_svg(template, size=70)
        st.markdown(
            f'<div class="template-badge-with-body">'
            f'<div class="template-badge-svg">{tmpl_svg}</div>'
            f'<div class="template-badge-text">'
            f'{template["emoji"]} {template["name"]}'
            f'</div></div>',
            unsafe_allow_html=True,
        )

    # --- Workout Type ---
    workout_type = st.selectbox(
        "סוג אימון",
        WORKOUT_TYPES,
        index=default_type,
    )

    # --- Training Type ---
    training_type = st.radio(
        "סוג",
        ["כוח", "סיבולת"],
        index=default_training,
        horizontal=True,
    )

    # --- Muscle Picker (visual, only for strength) ---
    target_muscle = None
    if training_type == "כוח":
        # Set default from template
        default_m = None
        if template and template.get("target_muscle") in MUSCLES:
            default_m = template["target_muscle"]
        if st.session_state.get("selected_muscle") is None and default_m:
            st.session_state.selected_muscle = default_m

        st.markdown('<div class="muscle-picker-label">בחר קבוצת שרירים</div>',
                    unsafe_allow_html=True)
        target_muscle = render_muscle_picker(default_m)
    else:
        # Show cardio body illustration
        cardio_svg = get_muscle_svg(None, "סיבולת", size=100)
        st.markdown(
            f'<div class="muscle-preview cardio">'
            f'{cardio_svg}'
            f'<div class="muscle-preview-label">קרדיו / סיבולת</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        st.session_state.selected_muscle = None

    # --- Duration ---
    duration = st.number_input(
        "משך (דקות)",
        min_value=5,
        max_value=180,
        value=default_duration,
        step=5,
    )

    # --- Difficulty Slider ---
    difficulty = st.slider("קושי", 1, 10, 5)

    # --- Feeling ---
    feeling = st.selectbox("איך הרגשת?", FEELINGS)

    # --- Equipment ---
    equipment = st.multiselect("כלים", EQUIPMENT, default=default_equipment)

    # --- Location ---
    location = st.radio("מקום", LOCATIONS, index=default_location, horizontal=True)

    # --- Company ---
    company = st.radio("עם מי?", COMPANY, horizontal=True)

    # --- Save Button ---
    if st.button("שמור אימון 💾", use_container_width=True, type="primary"):
        workout = {
            "workout_type": workout_type,
            "training_type": training_type,
            "target_muscle": target_muscle,
            "duration_minutes": duration,
            "difficulty": difficulty,
            "feeling": feeling,
            "equipment": equipment,
            "location": location,
            "company": company,
            "template_id": template["id"] if template else None,
        }

        save_workout(st.session_state.user_id, workout)

        # Coach encouragement
        msg = get_post_workout_message(difficulty, feeling)
        save_message(st.session_state.user_id, "coach", msg)

        st.session_state.selected_template = None
        st.session_state.selected_muscle = None
        st.session_state.workout_saved = True
        st.rerun()

    if st.session_state.get("workout_saved"):
        st.success("האימון נשמר! כל הכבוד! 💪")
        st.session_state.workout_saved = False

    if template:
        if st.button("נקה תבנית", use_container_width=True):
            st.session_state.selected_template = None
            st.session_state.selected_muscle = None
            st.rerun()


# ------------------------------------
# Templates
# ------------------------------------
def render_templates():
    st.markdown('<h2 class="section-title">📋 תבניות מהירות</h2>',
                unsafe_allow_html=True)

    # Category filter
    categories = ["הכל", "כוח", "סיבולת", "גמישות"]
    selected_cat = st.radio(
        "קטגוריה",
        categories,
        horizontal=True,
        label_visibility="collapsed",
    )

    filtered = TEMPLATES if selected_cat == "הכל" else [
        t for t in TEMPLATES if t["category"] == selected_cat
    ]

    # Render templates in grid with muscle illustrations
    for i in range(0, len(filtered), 2):
        cols = st.columns(2)
        for j, col in enumerate(cols):
            idx = i + j
            if idx >= len(filtered):
                break
            t = filtered[idx]
            with col:
                tmpl_svg = get_template_muscle_svg(t, size=50)
                st.markdown(
                    f'<div class="template-card">'
                    f'<div class="template-card-body">{tmpl_svg}</div>'
                    f'<div class="template-name">{t["name"]}</div>'
                    f'<div class="template-meta">{t["location"]} · {t["training_type"]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
                if st.button(
                    "בחר",
                    key=f'tmpl_{t["id"]}',
                    use_container_width=True,
                ):
                    st.session_state.selected_template = t
                    st.session_state.page = "log"
                    st.rerun()


# ------------------------------------
# Coach Chat
# ------------------------------------
def render_coach():
    st.markdown('<h2 class="section-title">🤖 הקואצ׳ שלך</h2>',
                unsafe_allow_html=True)

    user_id = st.session_state.user_id

    # Initialize coach messages
    if not st.session_state.coach_messages:
        greeting = get_greeting()
        st.session_state.coach_messages = [
            {"role": "coach", "content": greeting}
        ]
        save_message(user_id, "coach", greeting)

    # Render chat messages
    for msg in st.session_state.coach_messages:
        if msg["role"] == "coach":
            st.markdown(
                f'<div class="chat-msg coach">'
                f'<span class="chat-avatar">🤖</span>'
                f'<div class="chat-bubble coach">{msg["content"]}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                f'<div class="chat-msg user">'
                f'<div class="chat-bubble user">{msg["content"]}</div>'
                f'<span class="chat-avatar">🏃</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Coach flow
    step = st.session_state.coach_step

    if step == "greeting":
        st.markdown("**איך רמת האנרגיה שלך?**")
        cols = st.columns(3)
        for idx, (level, info) in enumerate(ENERGY_LEVELS.items()):
            with cols[idx]:
                if st.button(
                    f'{info["emoji"]} {info["label"]}',
                    key=f"energy_{level}",
                    use_container_width=True,
                ):
                    st.session_state.coach_energy = level
                    user_msg = f'{info["emoji"]} {info["label"]}'
                    st.session_state.coach_messages.append(
                        {"role": "user", "content": user_msg}
                    )
                    save_message(user_id, "user", user_msg)

                    # Coach responds
                    suggestion = get_workout_suggestion(level)
                    coach_msg = f"{suggestion}\n\nרוצה להתחיל אימון?"
                    st.session_state.coach_messages.append(
                        {"role": "coach", "content": coach_msg}
                    )
                    save_message(user_id, "coach", coach_msg)
                    st.session_state.coach_step = "want_workout"
                    st.rerun()

    elif step == "want_workout":
        cols = st.columns(2)
        with cols[0]:
            if st.button("כן! 💪", key="want_yes", use_container_width=True,
                          type="primary"):
                st.session_state.coach_messages.append(
                    {"role": "user", "content": "כן! 💪"}
                )
                save_message(user_id, "user", "כן! 💪")

                coach_msg = "מעולה! איזה סוג אימון?"
                st.session_state.coach_messages.append(
                    {"role": "coach", "content": coach_msg}
                )
                save_message(user_id, "coach", coach_msg)
                st.session_state.coach_step = "choose_type"
                st.rerun()

        with cols[1]:
            if st.button("לא היום", key="want_no", use_container_width=True):
                st.session_state.coach_messages.append(
                    {"role": "user", "content": "לא היום"}
                )
                save_message(user_id, "user", "לא היום")

                coach_msg = get_no_workout_message()
                st.session_state.coach_messages.append(
                    {"role": "coach", "content": coach_msg}
                )
                save_message(user_id, "coach", coach_msg)
                st.session_state.coach_step = "done"
                st.rerun()

    elif step == "choose_type":
        # Suggest templates based on energy - with muscle illustrations
        energy = st.session_state.coach_energy or "medium"
        suggested_ids = get_template_suggestion(energy)
        suggested_templates = [
            get_template_by_id(tid) for tid in suggested_ids
        ]
        suggested_templates = [t for t in suggested_templates if t]

        st.markdown("**הצעות עבורך:**")
        for t in suggested_templates[:3]:
            tmpl_svg = get_template_muscle_svg(t, size=40)
            st.markdown(
                f'<div class="coach-suggestion-card">'
                f'{tmpl_svg}'
                f'<span>{t["name"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if st.button(
                f'{t["emoji"]} {t["name"]}',
                key=f'coach_tmpl_{t["id"]}',
                use_container_width=True,
            ):
                st.session_state.coach_messages.append(
                    {"role": "user", "content": f'{t["emoji"]} {t["name"]}'}
                )
                save_message(user_id, "user", t["name"])

                st.session_state.selected_template = t
                coach_msg = f'בחירה מצוינת! {t["name"]} - בוא נמלא את הפרטים! ➡️'
                st.session_state.coach_messages.append(
                    {"role": "coach", "content": coach_msg}
                )
                save_message(user_id, "coach", coach_msg)
                st.session_state.coach_step = "done"
                st.session_state.page = "log"
                st.rerun()

        if st.button("אימון אחר...", key="coach_other",
                      use_container_width=True):
            st.session_state.page = "log"
            st.session_state.coach_step = "done"
            st.rerun()

    elif step == "done":
        if st.button("שיחה חדשה 🔄", use_container_width=True):
            st.session_state.coach_step = "greeting"
            st.session_state.coach_messages = []
            st.session_state.coach_energy = None
            st.rerun()


# ------------------------------------
# Main App
# ------------------------------------
def main():
    if not st.session_state.authenticated:
        render_auth()
        return

    render_nav()

    st.markdown("---")

    page = st.session_state.page
    if page == "dashboard":
        render_dashboard()
    elif page == "log":
        render_log_workout()
    elif page == "coach":
        render_coach()
    elif page == "templates":
        render_templates()


if __name__ == "__main__":
    main()
