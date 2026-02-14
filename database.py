"""
FitnessMate - Database Layer (Supabase)
Handles all DB operations. Falls back to session state for demo mode.
"""

import streamlit as st
from datetime import date, datetime, timedelta
from config import SUPABASE_URL, SUPABASE_KEY

# ------------------------------------
# Supabase Client
# ------------------------------------
_supabase_client = None


def get_supabase():
    global _supabase_client
    if _supabase_client is None and SUPABASE_URL and SUPABASE_KEY:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


def is_demo_mode():
    return get_supabase() is None


# ------------------------------------
# Demo Mode - Session State Storage
# ------------------------------------
def _init_demo_storage():
    if "demo_workouts" not in st.session_state:
        st.session_state.demo_workouts = []
    if "demo_messages" not in st.session_state:
        st.session_state.demo_messages = []
    if "demo_profile" not in st.session_state:
        st.session_state.demo_profile = {
            "id": "demo-user",
            "display_name": "מתאמן",
            "streak_days": 0,
            "total_workouts": 0,
        }
    if "demo_goals" not in st.session_state:
        st.session_state.demo_goals = []


# ------------------------------------
# Auth
# ------------------------------------
def sign_up(email: str, password: str, display_name: str):
    sb = get_supabase()
    if sb:
        return sb.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"display_name": display_name}},
        })
    return None


def sign_in(email: str, password: str):
    sb = get_supabase()
    if sb:
        return sb.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
    return None


def get_current_user_id():
    if is_demo_mode():
        return "demo-user"
    sb = get_supabase()
    if sb and sb.auth.get_user():
        return sb.auth.get_user().user.id
    return None


# ------------------------------------
# Profile
# ------------------------------------
def get_profile(user_id: str):
    if is_demo_mode():
        _init_demo_storage()
        return st.session_state.demo_profile

    sb = get_supabase()
    res = sb.table("profiles").select("*").eq("id", user_id).single().execute()
    return res.data


def update_profile(user_id: str, data: dict):
    if is_demo_mode():
        _init_demo_storage()
        st.session_state.demo_profile.update(data)
        return st.session_state.demo_profile

    sb = get_supabase()
    res = sb.table("profiles").update(data).eq("id", user_id).execute()
    return res.data[0] if res.data else None


# ------------------------------------
# Workouts
# ------------------------------------
def save_workout(user_id: str, workout: dict):
    workout["user_id"] = user_id
    if "workout_date" not in workout:
        workout["workout_date"] = date.today().isoformat()

    if is_demo_mode():
        _init_demo_storage()
        workout["id"] = f"demo-{len(st.session_state.demo_workouts)}"
        workout["created_at"] = datetime.now().isoformat()
        st.session_state.demo_workouts.append(workout)
        st.session_state.demo_profile["total_workouts"] = len(
            st.session_state.demo_workouts
        )
        return workout

    sb = get_supabase()
    res = sb.table("workouts").insert(workout).execute()
    return res.data[0] if res.data else None


def get_today_workouts(user_id: str):
    today = date.today().isoformat()

    if is_demo_mode():
        _init_demo_storage()
        return [
            w for w in st.session_state.demo_workouts
            if w.get("workout_date") == today
        ]

    sb = get_supabase()
    res = (
        sb.table("workouts")
        .select("*")
        .eq("user_id", user_id)
        .eq("workout_date", today)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def get_week_workouts(user_id: str):
    week_ago = (date.today() - timedelta(days=6)).isoformat()

    if is_demo_mode():
        _init_demo_storage()
        return [
            w for w in st.session_state.demo_workouts
            if w.get("workout_date", "") >= week_ago
        ]

    sb = get_supabase()
    res = (
        sb.table("workouts")
        .select("*")
        .eq("user_id", user_id)
        .gte("workout_date", week_ago)
        .order("workout_date", desc=True)
        .execute()
    )
    return res.data or []


def get_month_workouts(user_id: str):
    month_ago = (date.today() - timedelta(days=30)).isoformat()

    if is_demo_mode():
        _init_demo_storage()
        return [
            w for w in st.session_state.demo_workouts
            if w.get("workout_date", "") >= month_ago
        ]

    sb = get_supabase()
    res = (
        sb.table("workouts")
        .select("*")
        .eq("user_id", user_id)
        .gte("workout_date", month_ago)
        .order("workout_date", desc=True)
        .execute()
    )
    return res.data or []


def get_all_workouts(user_id: str, limit: int = 100):
    if is_demo_mode():
        _init_demo_storage()
        return list(reversed(st.session_state.demo_workouts[-limit:]))

    sb = get_supabase()
    res = (
        sb.table("workouts")
        .select("*")
        .eq("user_id", user_id)
        .order("workout_date", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def delete_workout(user_id: str, workout_id: str):
    if is_demo_mode():
        _init_demo_storage()
        st.session_state.demo_workouts = [
            w for w in st.session_state.demo_workouts
            if w.get("id") != workout_id
        ]
        st.session_state.demo_profile["total_workouts"] = len(
            st.session_state.demo_workouts
        )
        return True

    sb = get_supabase()
    sb.table("workouts").delete().eq("id", workout_id).eq("user_id", user_id).execute()
    return True


# ------------------------------------
# Streak Calculation
# ------------------------------------
def calculate_streak(user_id: str) -> int:
    if is_demo_mode():
        _init_demo_storage()
        workouts = st.session_state.demo_workouts
    else:
        sb = get_supabase()
        res = (
            sb.table("workouts")
            .select("workout_date")
            .eq("user_id", user_id)
            .order("workout_date", desc=True)
            .limit(60)
            .execute()
        )
        workouts = res.data or []

    workout_dates = sorted(
        {w.get("workout_date", "") for w in workouts if w.get("workout_date")},
        reverse=True,
    )

    if not workout_dates:
        return 0

    streak = 0
    check_date = date.today()

    # If no workout today, check if yesterday counts
    if workout_dates[0] != check_date.isoformat():
        if workout_dates[0] == (check_date - timedelta(days=1)).isoformat():
            check_date = check_date - timedelta(days=1)
        else:
            return 0

    for d_str in workout_dates:
        if d_str == check_date.isoformat():
            streak += 1
            check_date -= timedelta(days=1)
        elif d_str < check_date.isoformat():
            break

    return streak


# ------------------------------------
# Goals
# ------------------------------------
def get_goals(user_id: str):
    if is_demo_mode():
        _init_demo_storage()
        return st.session_state.demo_goals

    sb = get_supabase()
    res = (
        sb.table("goals")
        .select("*")
        .eq("user_id", user_id)
        .eq("active", True)
        .execute()
    )
    return res.data or []


def save_goal(user_id: str, goal: dict):
    goal["user_id"] = user_id
    goal["active"] = True
    goal["created_at"] = datetime.now().isoformat()

    if is_demo_mode():
        _init_demo_storage()
        goal["id"] = f"goal-{len(st.session_state.demo_goals)}"
        st.session_state.demo_goals.append(goal)
        return goal

    sb = get_supabase()
    res = sb.table("goals").insert(goal).execute()
    return res.data[0] if res.data else None


def delete_goal(user_id: str, goal_id: str):
    if is_demo_mode():
        _init_demo_storage()
        st.session_state.demo_goals = [
            g for g in st.session_state.demo_goals
            if g.get("id") != goal_id
        ]
        return True

    sb = get_supabase()
    sb.table("goals").update({"active": False}).eq("id", goal_id).eq("user_id", user_id).execute()
    return True


# ------------------------------------
# Coach Messages
# ------------------------------------
def save_message(user_id: str, role: str, content: str):
    msg = {
        "user_id": user_id,
        "role": role,
        "content": content,
        "created_at": datetime.now().isoformat(),
    }

    if is_demo_mode():
        _init_demo_storage()
        st.session_state.demo_messages.append(msg)
        return msg

    sb = get_supabase()
    res = sb.table("coach_messages").insert(msg).execute()
    return res.data[0] if res.data else None


def get_recent_messages(user_id: str, limit: int = 20):
    if is_demo_mode():
        _init_demo_storage()
        return st.session_state.demo_messages[-limit:]

    sb = get_supabase()
    res = (
        sb.table("coach_messages")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(res.data)) if res.data else []


# ------------------------------------
# Statistics Helpers
# ------------------------------------
def get_workout_stats(user_id: str) -> dict:
    """Calculate comprehensive workout statistics."""
    workouts = get_all_workouts(user_id, limit=500)
    if not workouts:
        return {
            "total": 0, "streak": 0, "total_minutes": 0,
            "avg_difficulty": 0, "favorite_type": "-",
            "favorite_muscle": "-", "muscle_counts": {},
            "type_counts": {}, "this_week": 0, "this_month": 0,
        }

    today = date.today()
    week_ago = (today - timedelta(days=6)).isoformat()
    month_ago = (today - timedelta(days=30)).isoformat()

    total_minutes = sum(w.get("duration_minutes", 0) for w in workouts)
    difficulties = [w.get("difficulty", 5) for w in workouts]
    avg_diff = sum(difficulties) / len(difficulties) if difficulties else 0

    # Count by type
    type_counts = {}
    for w in workouts:
        t = w.get("workout_type", "אחר")
        type_counts[t] = type_counts.get(t, 0) + 1

    # Count by muscle
    muscle_counts = {}
    for w in workouts:
        m = w.get("target_muscle")
        if m:
            muscle_counts[m] = muscle_counts.get(m, 0) + 1

    favorite_type = max(type_counts, key=type_counts.get) if type_counts else "-"
    favorite_muscle = max(muscle_counts, key=muscle_counts.get) if muscle_counts else "-"

    this_week = len([w for w in workouts if w.get("workout_date", "") >= week_ago])
    this_month = len([w for w in workouts if w.get("workout_date", "") >= month_ago])

    return {
        "total": len(workouts),
        "streak": calculate_streak(user_id),
        "total_minutes": total_minutes,
        "avg_difficulty": round(avg_diff, 1),
        "favorite_type": favorite_type,
        "favorite_muscle": favorite_muscle,
        "muscle_counts": muscle_counts,
        "type_counts": type_counts,
        "this_week": this_week,
        "this_month": this_month,
    }
