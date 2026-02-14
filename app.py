"""
FitnessMate - Main Streamlit Application
Fitness tracking app with minimal text input, touch-first design.
"""

import streamlit as st
from datetime import date, timedelta
import plotly.graph_objects as go
from collections import Counter

from config import (
    WORKOUT_TYPES, FEELINGS, EQUIPMENT, MUSCLES,
    LOCATIONS, COMPANY, ENERGY_LEVELS, GOAL_TYPES,
)
from database import (
    is_demo_mode, get_current_user_id, get_profile, update_profile,
    save_workout, get_today_workouts, get_week_workouts,
    get_month_workouts, get_all_workouts, delete_workout,
    save_message, get_recent_messages, calculate_streak,
    get_goals, save_goal, delete_goal, get_workout_stats,
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
# Load Custom CSS + Dark Mode
# ------------------------------------
def load_css():
    try:
        with open("styles.css", "r") as f:
            css = f.read()
        if st.session_state.get("dark_mode", False):
            css += "\n" + _dark_mode_css()
        st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        pass


def _dark_mode_css():
    return """
    :root {
        --primary: #66BB6A;
        --primary-light: #81C784;
        --primary-dark: #4CAF50;
        --secondary: #64B5F6;
        --secondary-light: #90CAF9;
        --bg: #1A1A2E;
        --card-bg: #16213E;
        --text: #E0E0E0;
        --text-light: #9E9E9E;
        --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        --shadow-hover: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .stApp { background-color: #1A1A2E !important; color: #E0E0E0 !important; }
    .stApp [data-testid="stHeader"] { background-color: #1A1A2E !important; }
    .today-card.done { background: linear-gradient(135deg, #1B5E20, #2E7D32) !important; border-color: #4CAF50 !important; }
    .today-card.pending { background: linear-gradient(135deg, #263238, #37474F) !important; border-color: #546E7A !important; }
    .week-day.done { background: linear-gradient(135deg, #1B5E20, #2E7D32) !important; }
    .week-day.empty { background: #263238 !important; }
    .insight-card { background: linear-gradient(135deg, #0D47A1, #1565C0) !important; color: #BBDEFB !important; border-color: #1976D2 !important; }
    .suggestion-card { background: linear-gradient(135deg, #E65100, #BF360C) !important; color: #FFE0B2 !important; border-color: #F57C00 !important; }
    .template-card { background: var(--card-bg) !important; border-color: #37474F !important; }
    .template-card:hover { border-color: var(--primary) !important; }
    .chat-bubble.coach { background: linear-gradient(135deg, #1B5E20, #2E7D32) !important; }
    .chat-bubble.user { background: linear-gradient(135deg, #0D47A1, #1565C0) !important; }
    .muscle-preview { background: linear-gradient(135deg, #1B5E20, #263238) !important; border-color: #4CAF50 !important; }
    .muscle-preview.cardio { background: linear-gradient(135deg, #B71C1C, #263238) !important; border-color: #EF5350 !important; }
    .template-badge-with-body { background: linear-gradient(135deg, #2E7D32, #1B5E20) !important; }
    .coach-suggestion-card { background: #1B5E20 !important; border-color: #2E7D32 !important; }
    .tag { background: #2E7D32 !important; }
    .stat-card { background: var(--card-bg) !important; border-color: #37474F !important; }
    .history-item { background: var(--card-bg) !important; border-color: #37474F !important; }
    .goal-card { background: var(--card-bg) !important; border-color: #37474F !important; }
    .streak-banner { background: linear-gradient(135deg, #E65100, #BF360C) !important; }
    .profile-header { background: linear-gradient(135deg, #1B5E20, #0D47A1) !important; }
    .muscle-card { border-color: #37474F !important; background: var(--card-bg) !important; }
    .day-name { color: #9E9E9E !important; }
    .section-title, .section-subtitle { color: #E0E0E0 !important; }
    .muscle-label, .muscle-preview-label { color: #E0E0E0 !important; }
    .template-name { color: #E0E0E0 !important; }
    .template-meta { color: #9E9E9E !important; }
    .today-status { color: #E0E0E0 !important; }
    .today-action { color: #9E9E9E !important; }
    hr { border-color: #37474F !important; }
    .stMarkdown { color: #E0E0E0 !important; }
    """


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
        "dark_mode": False,
        "confirm_delete": None,
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
            if not email or not password:
                st.error("נא למלא אימייל וסיסמה")
            else:
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
            if not name or not email_s or not password_s:
                st.error("נא למלא את כל השדות")
            elif len(password_s) < 6:
                st.error("סיסמה חייבת להכיל לפחות 6 תווים")
            else:
                try:
                    res = sign_up(email_s, password_s, name)
                    if res:
                        st.success("נרשמת בהצלחה! עכשיו תוכל להיכנס.")
                except Exception:
                    st.error("שגיאה בהרשמה.")


# ------------------------------------
# Navigation (5 tabs, mobile-optimized)
# ------------------------------------
def render_nav():
    cols = st.columns(5)
    pages = [
        ("dashboard", "📊", "דשבורד"),
        ("log", "➕", "אימון"),
        ("history", "📜", "היסטוריה"),
        ("coach", "🤖", "קואצ׳"),
        ("profile", "👤", "פרופיל"),
    ]
    for col, (page_id, icon, label) in zip(cols, pages):
        with col:
            btn_type = "primary" if st.session_state.page == page_id else "secondary"
            if st.button(f"{icon}\n{label}", key=f"nav_{page_id}",
                         use_container_width=True, type=btn_type):
                st.session_state.page = page_id
                st.rerun()


# ------------------------------------
# Streak Banner
# ------------------------------------
def render_streak_banner(user_id: str):
    streak = calculate_streak(user_id)
    if streak <= 0:
        return

    if streak >= 7:
        fire = "🔥" * min(streak // 7, 3)
        badge = "🏆"
    elif streak >= 3:
        fire = "🔥"
        badge = "⭐"
    else:
        fire = ""
        badge = "💪"

    st.markdown(
        f'<div class="streak-banner">'
        f'<span class="streak-fire">{fire}</span>'
        f'<span class="streak-count">{streak}</span>'
        f'<span class="streak-label">ימים ברצף {badge}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ------------------------------------
# Dashboard
# ------------------------------------
def render_dashboard():
    user_id = st.session_state.user_id
    today_workouts = get_today_workouts(user_id)
    week_workouts = get_week_workouts(user_id)

    # Streak banner
    render_streak_banner(user_id)

    # --- Today's Card with Muscle Image ---
    if today_workouts:
        w = today_workouts[0]
        muscle_badge = get_workout_muscle_badge(w, size=70)
        st.markdown(
            f'<div class="today-card done">'
            f'<div class="today-card-inner">'
            f'<div class="today-card-body">{muscle_badge}</div>'
            f'<div class="today-card-info">'
            f'<div class="today-status">✅ התאמנת היום!</div>'
            f'<div class="today-details">'
            f'<span class="tag">{w.get("workout_type", "")}</span>'
            f'<span class="tag">קושי {w.get("difficulty", "")}/10</span>'
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

    # --- Goal Progress (if goals exist) ---
    goals = get_goals(user_id)
    if goals:
        render_goal_progress_inline(goals, week_workouts)

    # --- Weekly View ---
    st.markdown('<h3 class="section-subtitle">השבוע</h3>',
                unsafe_allow_html=True)

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
                    size=30,
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
                    f'<div class="day-icon">-</div></div>',
                    unsafe_allow_html=True,
                )

    # --- Weekly Insight ---
    insight = get_weekly_insight(week_workouts)
    st.markdown(f'<div class="insight-card">{insight}</div>',
                unsafe_allow_html=True)

    # --- AI Suggestion ---
    energy = st.session_state.get("coach_energy", "medium") or "medium"
    suggestion, template_id = get_ai_suggestion(week_workouts, energy)
    template = get_template_by_id(template_id)

    if template:
        tmpl_svg = get_template_muscle_svg(template, size=55)
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

    # --- Progress Chart ---
    month_workouts = get_month_workouts(user_id)
    if month_workouts:
        st.markdown('<h3 class="section-subtitle">📈 30 ימים</h3>',
                    unsafe_allow_html=True)
        render_progress_chart(month_workouts)


def render_goal_progress_inline(goals, week_workouts):
    """Compact goal progress bars for dashboard."""
    week_count = len(week_workouts)
    week_minutes = sum(w.get("duration_minutes", 0) for w in week_workouts)
    week_strength = len([w for w in week_workouts if w.get("training_type") == "כוח"])

    for goal in goals:
        gtype = goal.get("goal_type", "")
        target = goal.get("target", 0)
        info = GOAL_TYPES.get(gtype)
        if not info or target <= 0:
            continue

        if gtype == "weekly_workouts":
            current = week_count
        elif gtype == "weekly_minutes":
            current = week_minutes
        elif gtype == "weekly_strength":
            current = week_strength
        else:
            continue

        pct = min(100, int(current / target * 100))
        achieved = current >= target

        bar_color = "#4CAF50" if achieved else "#42A5F5"
        check = " ✅" if achieved else ""

        st.markdown(
            f'<div class="goal-inline">'
            f'<div class="goal-inline-header">'
            f'<span>{info["icon"]} {current}/{target} {info["unit"]}{check}</span>'
            f'</div>'
            f'<div class="goal-bar-bg">'
            f'<div class="goal-bar-fill" style="width:{pct}%;background:{bar_color};"></div>'
            f'</div></div>',
            unsafe_allow_html=True,
        )


def render_progress_chart(workouts):
    dates_counter = Counter(w.get("workout_date", "") for w in workouts)
    chart_dates = []
    chart_counts = []
    for i in range(30):
        d = (date.today() - timedelta(days=29 - i)).isoformat()
        chart_dates.append(d)
        chart_counts.append(dates_counter.get(d, 0))

    is_dark = st.session_state.get("dark_mode", False)
    line_color = "#66BB6A" if is_dark else "#4CAF50"
    bg_color = "rgba(0,0,0,0)"

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=chart_dates, y=chart_counts,
        mode="lines+markers",
        line=dict(color=line_color, width=3),
        marker=dict(size=8, color=line_color),
        fill="tozeroy",
        fillcolor=f"rgba(76, 175, 80, {'0.2' if is_dark else '0.1'})",
    ))
    fig.update_layout(
        height=220,
        margin=dict(l=10, r=10, t=10, b=30),
        xaxis=dict(showgrid=False, tickformat="%d/%m",
                   color="#9E9E9E" if is_dark else "#607D8B"),
        yaxis=dict(showgrid=True, dtick=1, title="",
                   gridcolor="#37474F" if is_dark else "#E0E0E0",
                   color="#9E9E9E" if is_dark else "#607D8B"),
        plot_bgcolor=bg_color,
        paper_bgcolor=bg_color,
    )
    st.plotly_chart(fig, use_container_width=True)


# ------------------------------------
# Visual Muscle Picker
# ------------------------------------
def render_muscle_picker(default_muscle: str | None = None):
    current = st.session_state.get("selected_muscle", default_muscle)

    if current:
        svg_big = get_muscle_svg(current, "כוח", size=90)
        st.markdown(
            f'<div class="muscle-preview">'
            f'{svg_big}'
            f'<div class="muscle-preview-label">{current}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Row 1: 4 columns
    cols1 = st.columns(4)
    for idx, muscle in enumerate(MUSCLES[:4]):
        with cols1[idx]:
            is_sel = muscle == current
            card_html = get_muscle_card_html(muscle, is_selected=is_sel, size=50)
            st.markdown(card_html, unsafe_allow_html=True)
            if st.button(
                muscle, key=f"mpick_a_{idx}",
                use_container_width=True,
                type="primary" if is_sel else "secondary",
            ):
                st.session_state.selected_muscle = muscle
                st.rerun()

    # Row 2: 3 columns
    cols2 = st.columns(3)
    for idx, muscle in enumerate(MUSCLES[4:]):
        with cols2[idx]:
            is_sel = muscle == current
            card_html = get_muscle_card_html(muscle, is_selected=is_sel, size=50)
            st.markdown(card_html, unsafe_allow_html=True)
            if st.button(
                muscle, key=f"mpick_b_{idx}",
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

    default_type = WORKOUT_TYPES.index(template["workout_type"]) if template and template["workout_type"] in WORKOUT_TYPES else 0
    default_duration = template["duration_minutes"] if template else 30
    default_training = 0 if (template and template["training_type"] == "כוח") else 1 if template else 0
    default_location = LOCATIONS.index(template["location"]) if template and template["location"] in LOCATIONS else 0
    default_equipment = template["equipment"] if template else []

    if template:
        tmpl_svg = get_template_muscle_svg(template, size=60)
        st.markdown(
            f'<div class="template-badge-with-body">'
            f'<div class="template-badge-svg">{tmpl_svg}</div>'
            f'<div class="template-badge-text">'
            f'{template["emoji"]} {template["name"]}'
            f'</div></div>',
            unsafe_allow_html=True,
        )

    workout_type = st.selectbox("סוג אימון", WORKOUT_TYPES, index=default_type)

    training_type = st.radio("סוג", ["כוח", "סיבולת"],
                             index=default_training, horizontal=True)

    target_muscle = None
    if training_type == "כוח":
        default_m = None
        if template and template.get("target_muscle") in MUSCLES:
            default_m = template["target_muscle"]
        if st.session_state.get("selected_muscle") is None and default_m:
            st.session_state.selected_muscle = default_m

        st.markdown('<div class="muscle-picker-label">בחר קבוצת שרירים</div>',
                    unsafe_allow_html=True)
        target_muscle = render_muscle_picker(default_m)
    else:
        cardio_svg = get_muscle_svg(None, "סיבולת", size=90)
        st.markdown(
            f'<div class="muscle-preview cardio">'
            f'{cardio_svg}'
            f'<div class="muscle-preview-label">קרדיו / סיבולת</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        st.session_state.selected_muscle = None

    duration = st.number_input("משך (דקות)", min_value=5, max_value=180,
                               value=default_duration, step=5)
    difficulty = st.slider("קושי", 1, 10, 5)
    feeling = st.selectbox("איך הרגשת?", FEELINGS)
    equipment = st.multiselect("כלים", EQUIPMENT, default=default_equipment)
    location = st.radio("מקום", LOCATIONS, index=default_location, horizontal=True)
    company = st.radio("עם מי?", COMPANY, horizontal=True)

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
        msg = get_post_workout_message(difficulty, feeling)
        save_message(st.session_state.user_id, "coach", msg)

        st.session_state.selected_template = None
        st.session_state.selected_muscle = None
        st.session_state.workout_saved = True
        st.rerun()

    if st.session_state.get("workout_saved"):
        streak = calculate_streak(st.session_state.user_id)
        streak_msg = get_streak_message(streak) if streak > 0 else ""
        st.success(f"האימון נשמר! כל הכבוד! 💪 {streak_msg}")
        st.session_state.workout_saved = False

    if template:
        if st.button("נקה תבנית", use_container_width=True):
            st.session_state.selected_template = None
            st.session_state.selected_muscle = None
            st.rerun()

    # Quick templates at bottom
    st.markdown('<h3 class="section-subtitle">📋 תבניות מהירות</h3>',
                unsafe_allow_html=True)
    _render_quick_templates()


def _render_quick_templates():
    """Compact template list for log page."""
    for i in range(0, min(6, len(TEMPLATES)), 3):
        cols = st.columns(3)
        for j, col in enumerate(cols):
            idx = i + j
            if idx >= len(TEMPLATES):
                break
            t = TEMPLATES[idx]
            with col:
                tmpl_svg = get_template_muscle_svg(t, size=35)
                st.markdown(
                    f'<div class="template-card-mini">'
                    f'{tmpl_svg}'
                    f'<span class="template-card-mini-name">{t["name"]}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
                if st.button("בחר", key=f'qtempl_{t["id"]}',
                              use_container_width=True):
                    st.session_state.selected_template = t
                    st.rerun()


# ------------------------------------
# History Page
# ------------------------------------
def render_history():
    st.markdown('<h2 class="section-title">📜 היסטוריית אימונים</h2>',
                unsafe_allow_html=True)

    user_id = st.session_state.user_id
    all_workouts = get_all_workouts(user_id, limit=100)

    if not all_workouts:
        st.markdown(
            '<div class="empty-state">'
            '<div class="empty-icon">📜</div>'
            '<div class="empty-text">עוד אין אימונים</div>'
            '<div class="empty-sub">לחץ על ➕ כדי לרשום אימון ראשון!</div>'
            '</div>',
            unsafe_allow_html=True,
        )
        return

    # Tabs: list / analytics
    tab_list, tab_analytics = st.tabs(["רשימה", "📊 ניתוח"])

    with tab_list:
        _render_history_list(all_workouts)

    with tab_analytics:
        _render_analytics(all_workouts)


def _render_history_list(workouts):
    """Scrollable workout history list."""
    current_date_label = ""

    for w in workouts:
        w_date = w.get("workout_date", "")
        if w_date != current_date_label:
            current_date_label = w_date
            try:
                d = date.fromisoformat(w_date)
                if d == date.today():
                    label = "היום"
                elif d == date.today() - timedelta(days=1):
                    label = "אתמול"
                else:
                    label = d.strftime("%d/%m/%Y")
            except ValueError:
                label = w_date
            st.markdown(f'<div class="history-date-label">{label}</div>',
                        unsafe_allow_html=True)

        muscle_svg = get_muscle_svg(
            w.get("target_muscle"),
            w.get("training_type", "כוח"),
            size=40,
        )

        w_type = w.get("workout_type", "")
        w_dur = w.get("duration_minutes", 0)
        w_diff = w.get("difficulty", 0)
        w_muscle = w.get("target_muscle", "")
        muscle_text = f' · {w_muscle}' if w_muscle else ""

        st.markdown(
            f'<div class="history-item">'
            f'<div class="history-item-body">{muscle_svg}</div>'
            f'<div class="history-item-info">'
            f'<div class="history-item-title">{w_type}{muscle_text}</div>'
            f'<div class="history-item-meta">'
            f'{w_dur} דק׳ · קושי {w_diff}/10'
            f'</div></div></div>',
            unsafe_allow_html=True,
        )

        # Delete button
        w_id = w.get("id", "")
        if st.session_state.get("confirm_delete") == w_id:
            c1, c2 = st.columns(2)
            with c1:
                if st.button("❌ מחק", key=f"del_yes_{w_id}",
                              use_container_width=True, type="primary"):
                    delete_workout(st.session_state.user_id, w_id)
                    st.session_state.confirm_delete = None
                    st.rerun()
            with c2:
                if st.button("ביטול", key=f"del_no_{w_id}",
                              use_container_width=True):
                    st.session_state.confirm_delete = None
                    st.rerun()
        else:
            if st.button("🗑️", key=f"del_{w_id}"):
                st.session_state.confirm_delete = w_id
                st.rerun()


# ------------------------------------
# Analytics (inside History)
# ------------------------------------
def _render_analytics(workouts):
    """Analytics tab with muscle heatmap, type breakdown, trends."""
    stats = get_workout_stats(st.session_state.user_id)

    # Quick stat cards
    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{stats["total"]}</div>'
            f'<div class="stat-label">סה״כ</div>'
            f'</div>', unsafe_allow_html=True)
    with c2:
        hours = stats["total_minutes"] // 60
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{hours}</div>'
            f'<div class="stat-label">שעות</div>'
            f'</div>', unsafe_allow_html=True)
    with c3:
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{stats["avg_difficulty"]}</div>'
            f'<div class="stat-label">קושי ממוצע</div>'
            f'</div>', unsafe_allow_html=True)

    # Muscle heatmap - visual body with intensity
    if stats["muscle_counts"]:
        st.markdown('<h3 class="section-subtitle">מפת שרירים</h3>',
                    unsafe_allow_html=True)
        _render_muscle_heatmap(stats["muscle_counts"])

    # Workout type breakdown
    if stats["type_counts"]:
        st.markdown('<h3 class="section-subtitle">סוגי אימונים</h3>',
                    unsafe_allow_html=True)
        _render_type_chart(stats["type_counts"])

    # Difficulty trend
    if len(workouts) >= 3:
        st.markdown('<h3 class="section-subtitle">מגמת קושי</h3>',
                    unsafe_allow_html=True)
        _render_difficulty_trend(workouts)


def _render_muscle_heatmap(muscle_counts: dict):
    """Visual muscle group frequency display using body SVGs."""
    max_count = max(muscle_counts.values()) if muscle_counts else 1

    cols = st.columns(4)
    idx = 0
    for muscle in MUSCLES:
        count = muscle_counts.get(muscle, 0)
        if count == 0:
            continue
        intensity = count / max_count
        # Color from light green to dark green
        r = int(200 - intensity * 130)
        g = int(230 - intensity * 50)
        b = int(200 - intensity * 130)
        color = f"#{r:02x}{g:02x}{b:02x}"

        with cols[idx % 4]:
            svg = get_muscle_svg(muscle, "כוח", size=50)
            st.markdown(
                f'<div class="heatmap-cell" style="background:rgba({r},{g},{b},0.15);'
                f'border:2px solid {color};border-radius:12px;padding:8px;'
                f'text-align:center;margin-bottom:8px;">'
                f'{svg}'
                f'<div style="font-size:0.8rem;font-weight:700;margin-top:4px;">'
                f'{muscle}</div>'
                f'<div style="font-size:1.1rem;font-weight:800;color:{color};">'
                f'{count}x</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        idx += 1


def _render_type_chart(type_counts: dict):
    """Horizontal bar chart of workout types."""
    is_dark = st.session_state.get("dark_mode", False)
    labels = list(type_counts.keys())
    values = list(type_counts.values())

    fig = go.Figure(go.Bar(
        x=values, y=labels, orientation='h',
        marker_color=["#4CAF50", "#42A5F5", "#FF9800", "#9C27B0", "#F44336", "#00BCD4"][:len(labels)],
        text=values, textposition='auto',
    ))
    fig.update_layout(
        height=max(150, len(labels) * 45),
        margin=dict(l=10, r=10, t=5, b=5),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=False, showticklabels=False),
        yaxis=dict(showgrid=False, autorange="reversed",
                   tickfont=dict(size=13, color="#9E9E9E" if is_dark else "#607D8B")),
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_difficulty_trend(workouts):
    """Line chart of workout difficulty over time."""
    is_dark = st.session_state.get("dark_mode", False)
    recent = workouts[:20]
    dates = [w.get("workout_date", "") for w in recent]
    diffs = [w.get("difficulty", 5) for w in recent]

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates, y=diffs, mode="lines+markers",
        line=dict(color="#FF9800", width=2),
        marker=dict(size=7, color="#FF9800"),
        fill="tozeroy",
        fillcolor="rgba(255,152,0,0.1)",
    ))
    fig.update_layout(
        height=180,
        margin=dict(l=10, r=10, t=5, b=25),
        xaxis=dict(showgrid=False, tickformat="%d/%m",
                   color="#9E9E9E" if is_dark else "#607D8B"),
        yaxis=dict(showgrid=True, dtick=2, range=[0, 11], title="",
                   gridcolor="#37474F" if is_dark else "#E0E0E0",
                   color="#9E9E9E" if is_dark else "#607D8B"),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig, use_container_width=True)


# ------------------------------------
# Templates (inside Log page)
# ------------------------------------
def render_templates():
    st.markdown('<h2 class="section-title">📋 תבניות מהירות</h2>',
                unsafe_allow_html=True)

    categories = ["הכל", "כוח", "סיבולת", "גמישות"]
    selected_cat = st.radio("קטגוריה", categories, horizontal=True,
                            label_visibility="collapsed")

    filtered = TEMPLATES if selected_cat == "הכל" else [
        t for t in TEMPLATES if t["category"] == selected_cat
    ]

    for i in range(0, len(filtered), 2):
        cols = st.columns(2)
        for j, col in enumerate(cols):
            idx = i + j
            if idx >= len(filtered):
                break
            t = filtered[idx]
            with col:
                tmpl_svg = get_template_muscle_svg(t, size=45)
                st.markdown(
                    f'<div class="template-card">'
                    f'<div class="template-card-body">{tmpl_svg}</div>'
                    f'<div class="template-name">{t["name"]}</div>'
                    f'<div class="template-meta">{t["location"]} · {t["training_type"]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
                if st.button("בחר", key=f'tmpl_{t["id"]}',
                              use_container_width=True):
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

    if not st.session_state.coach_messages:
        greeting = get_greeting()
        st.session_state.coach_messages = [
            {"role": "coach", "content": greeting}
        ]
        save_message(user_id, "coach", greeting)

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
                        {"role": "user", "content": user_msg})
                    save_message(user_id, "user", user_msg)
                    suggestion = get_workout_suggestion(level)
                    coach_msg = f"{suggestion}\n\nרוצה להתחיל אימון?"
                    st.session_state.coach_messages.append(
                        {"role": "coach", "content": coach_msg})
                    save_message(user_id, "coach", coach_msg)
                    st.session_state.coach_step = "want_workout"
                    st.rerun()

    elif step == "want_workout":
        cols = st.columns(2)
        with cols[0]:
            if st.button("כן! 💪", key="want_yes", use_container_width=True,
                          type="primary"):
                st.session_state.coach_messages.append(
                    {"role": "user", "content": "כן! 💪"})
                save_message(user_id, "user", "כן! 💪")
                coach_msg = "מעולה! איזה סוג אימון?"
                st.session_state.coach_messages.append(
                    {"role": "coach", "content": coach_msg})
                save_message(user_id, "coach", coach_msg)
                st.session_state.coach_step = "choose_type"
                st.rerun()
        with cols[1]:
            if st.button("לא היום", key="want_no", use_container_width=True):
                st.session_state.coach_messages.append(
                    {"role": "user", "content": "לא היום"})
                save_message(user_id, "user", "לא היום")
                coach_msg = get_no_workout_message()
                st.session_state.coach_messages.append(
                    {"role": "coach", "content": coach_msg})
                save_message(user_id, "coach", coach_msg)
                st.session_state.coach_step = "done"
                st.rerun()

    elif step == "choose_type":
        energy = st.session_state.coach_energy or "medium"
        suggested_ids = get_template_suggestion(energy)
        suggested_templates = [
            get_template_by_id(tid) for tid in suggested_ids
        ]
        suggested_templates = [t for t in suggested_templates if t]

        for t in suggested_templates[:3]:
            tmpl_svg = get_template_muscle_svg(t, size=35)
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
                    {"role": "user", "content": f'{t["emoji"]} {t["name"]}'})
                save_message(user_id, "user", t["name"])
                st.session_state.selected_template = t
                coach_msg = f'בחירה מצוינת! {t["name"]} ➡️'
                st.session_state.coach_messages.append(
                    {"role": "coach", "content": coach_msg})
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
# Profile Page
# ------------------------------------
def render_profile():
    user_id = st.session_state.user_id
    profile = get_profile(user_id)
    stats = get_workout_stats(user_id)

    name = profile.get("display_name", "מתאמן") if profile else "מתאמן"

    # Profile header
    st.markdown(
        f'<div class="profile-header">'
        f'<div class="profile-avatar">🏋️</div>'
        f'<div class="profile-name">{name}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Quick stats
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{stats["total"]}</div>'
            f'<div class="stat-label">אימונים</div>'
            f'</div>', unsafe_allow_html=True)
    with c2:
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{stats["streak"]}</div>'
            f'<div class="stat-label">רצף</div>'
            f'</div>', unsafe_allow_html=True)
    with c3:
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{stats["this_month"]}</div>'
            f'<div class="stat-label">החודש</div>'
            f'</div>', unsafe_allow_html=True)
    with c4:
        hours = stats["total_minutes"] // 60
        st.markdown(
            f'<div class="stat-card">'
            f'<div class="stat-value">{hours}h</div>'
            f'<div class="stat-label">שעות</div>'
            f'</div>', unsafe_allow_html=True)

    # Favorite muscle badge
    if stats["favorite_muscle"] != "-":
        fav_svg = get_muscle_svg(stats["favorite_muscle"], "כוח", size=60)
        st.markdown(
            f'<div class="fav-muscle-card">'
            f'{fav_svg}'
            f'<div class="fav-muscle-label">השריר האהוב: {stats["favorite_muscle"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # --- Goals Section ---
    st.markdown('<h3 class="section-subtitle">🎯 יעדים</h3>',
                unsafe_allow_html=True)
    _render_goals(user_id)

    # --- Settings ---
    st.markdown('<h3 class="section-subtitle">⚙️ הגדרות</h3>',
                unsafe_allow_html=True)

    # Dark mode toggle
    dark = st.toggle("מצב כהה 🌙", value=st.session_state.get("dark_mode", False),
                     key="dark_toggle")
    if dark != st.session_state.get("dark_mode", False):
        st.session_state.dark_mode = dark
        st.rerun()

    # Templates quick access
    st.markdown('<h3 class="section-subtitle">📋 תבניות</h3>',
                unsafe_allow_html=True)
    if st.button("צפה בכל התבניות", use_container_width=True):
        st.session_state.page = "templates_full"
        st.rerun()


def _render_goals(user_id: str):
    """Goals management section."""
    goals = get_goals(user_id)
    week_workouts = get_week_workouts(user_id)
    week_count = len(week_workouts)
    week_minutes = sum(w.get("duration_minutes", 0) for w in week_workouts)
    week_strength = len([w for w in week_workouts if w.get("training_type") == "כוח"])

    if goals:
        for goal in goals:
            gtype = goal.get("goal_type", "")
            target = goal.get("target", 0)
            info = GOAL_TYPES.get(gtype)
            if not info or target <= 0:
                continue

            if gtype == "weekly_workouts":
                current = week_count
            elif gtype == "weekly_minutes":
                current = week_minutes
            elif gtype == "weekly_strength":
                current = week_strength
            else:
                continue

            pct = min(100, int(current / target * 100))
            achieved = current >= target
            bar_color = "#4CAF50" if achieved else "#42A5F5"
            status = "✅ הושג!" if achieved else f"{pct}%"

            st.markdown(
                f'<div class="goal-card">'
                f'<div class="goal-card-header">'
                f'<span class="goal-card-icon">{info["icon"]}</span>'
                f'<span class="goal-card-title">{info["label"]}</span>'
                f'<span class="goal-card-status">{status}</span>'
                f'</div>'
                f'<div class="goal-card-progress">'
                f'<div class="goal-bar-bg">'
                f'<div class="goal-bar-fill" style="width:{pct}%;background:{bar_color};"></div>'
                f'</div>'
                f'<div class="goal-card-detail">{current} / {target} {info["unit"]}</div>'
                f'</div></div>',
                unsafe_allow_html=True,
            )

            if st.button("🗑️ הסר יעד", key=f'del_goal_{goal.get("id", "")}'):
                delete_goal(user_id, goal.get("id", ""))
                st.rerun()

    # Add new goal
    with st.expander("➕ הוסף יעד חדש"):
        goal_type = st.selectbox(
            "סוג יעד",
            list(GOAL_TYPES.keys()),
            format_func=lambda x: f'{GOAL_TYPES[x]["icon"]} {GOAL_TYPES[x]["label"]}',
            key="new_goal_type",
        )
        info = GOAL_TYPES[goal_type]
        target = st.select_slider(
            f'בחר יעד ({info["unit"]})',
            options=info["options"],
            value=info["default"],
            key="new_goal_target",
        )
        if st.button("שמור יעד", use_container_width=True, type="primary"):
            save_goal(user_id, {"goal_type": goal_type, "target": target})
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
    elif page == "history":
        render_history()
    elif page == "coach":
        render_coach()
    elif page == "profile":
        render_profile()
    elif page == "templates_full":
        render_templates()


if __name__ == "__main__":
    main()
