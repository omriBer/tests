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
