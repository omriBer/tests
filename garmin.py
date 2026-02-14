"""
FitnessMate - Garmin Connect Integration
Fetches health data from Garmin Connect: Body Battery, sleep, stress, steps.
Falls back to demo data when credentials are not configured.
"""

import streamlit as st
from datetime import date

_garmin_client = None
_garmin_connected = False


def _get_garmin_client():
    """Initialize Garmin Connect client if credentials exist."""
    global _garmin_client, _garmin_connected
    if _garmin_client is not None:
        return _garmin_client

    try:
        garmin_email = st.secrets.get("GARMIN_EMAIL", "")
        garmin_password = st.secrets.get("GARMIN_PASSWORD", "")
    except Exception:
        return None

    if not garmin_email or not garmin_password:
        return None

    try:
        from garminconnect import Garmin
        client = Garmin(garmin_email, garmin_password)
        client.login()
        _garmin_client = client
        _garmin_connected = True
        return client
    except Exception:
        return None


def is_garmin_connected():
    """Check if Garmin is connected."""
    return _get_garmin_client() is not None


def get_garmin_data():
    """Get all Garmin health data for today. Returns dict with all metrics."""
    client = _get_garmin_client()
    if client is None:
        return _get_demo_data()

    try:
        today = date.today().isoformat()
        stats = client.get_stats(today)

        body_battery = _safe_get_body_battery(client)
        sleep_hours = _safe_get_sleep(stats)
        stress = stats.get("averageStressLevel", 0)
        steps = stats.get("totalSteps", 0)
        heart_rate = stats.get("restingHeartRate", 0)
        calories = stats.get("totalKilocalories", 0)

        return {
            "body_battery": body_battery,
            "sleep_hours": sleep_hours,
            "stress": stress,
            "steps": steps,
            "heart_rate": heart_rate,
            "calories": calories,
            "connected": True,
        }
    except Exception:
        return _get_demo_data()


def _safe_get_body_battery(client):
    """Get Body Battery level safely."""
    try:
        bb_data = client.get_body_battery(date.today().isoformat())
        if bb_data and isinstance(bb_data, list) and len(bb_data) > 0:
            latest = bb_data[-1]
            return latest.get("chargedValue", latest.get("bodyBatteryLevel", 0))
    except Exception:
        pass
    return 0


def _safe_get_sleep(stats):
    """Get sleep hours from stats safely."""
    try:
        sleep_seconds = stats.get("sleepingSeconds", 0) or 0
        return round(sleep_seconds / 3600, 1)
    except Exception:
        return 0


def _get_demo_data():
    """Return demo Garmin data for UI preview."""
    return {
        "body_battery": 72,
        "sleep_hours": 7.2,
        "stress": 28,
        "steps": 4350,
        "heart_rate": 62,
        "calories": 1850,
        "connected": False,
    }


def get_energy_suggestion(garmin_data):
    """Suggest energy level based on Garmin data."""
    bb = garmin_data.get("body_battery", 50)
    stress = garmin_data.get("stress", 30)
    sleep = garmin_data.get("sleep_hours", 7)

    if bb >= 70 and stress < 40 and sleep >= 7:
        return "high"
    elif bb >= 40 and stress < 60:
        return "medium"
    else:
        return "low"


def get_garmin_insight(garmin_data):
    """Generate a Hebrew insight based on Garmin data."""
    bb = garmin_data.get("body_battery", 0)
    sleep = garmin_data.get("sleep_hours", 0)
    stress = garmin_data.get("stress", 0)
    steps = garmin_data.get("steps", 0)

    insights = []

    if bb >= 80:
        insights.append("Body Battery גבוה! יום מצוין לאימון אינטנסיבי")
    elif bb >= 50:
        insights.append("Body Battery בסדר - אימון בינוני יתאים")
    elif bb > 0:
        insights.append("Body Battery נמוך - אולי יוגה או הליכה קלה?")

    if sleep >= 8:
        insights.append("שנת לילה מצוינת!")
    elif sleep >= 6:
        insights.append("שינה סבירה")
    elif sleep > 0:
        insights.append("שינה קצרה - תיזהר מעומס")

    if stress >= 60:
        insights.append("סטרס גבוה - אימון יעזור להוריד")
    elif stress >= 30:
        insights.append("סטרס בנורמה")

    if steps >= 10000:
        insights.append(f"כבר {steps:,} צעדים! יום פעיל")
    elif steps >= 5000:
        insights.append(f"{steps:,} צעדים - ממשיכים")

    return " | ".join(insights) if insights else "מחובר ל-Garmin"


def render_garmin_widget_html(garmin_data):
    """Return HTML for the Garmin widget."""
    bb = garmin_data.get("body_battery", 0)
    sleep = garmin_data.get("sleep_hours", 0)
    stress = garmin_data.get("stress", 0)
    steps = garmin_data.get("steps", 0)

    bb_color = "green" if bb >= 60 else "orange" if bb >= 30 else "red"
    stress_color = "green" if stress < 30 else "orange" if stress < 60 else "red"
    connected_label = "Garmin Connect" if garmin_data.get("connected") else "Garmin (דמו)"

    return f"""<div class="garmin-widget">
        <div class="garmin-widget-title">⌚ {connected_label}</div>
        <div class="garmin-stats">
            <div class="garmin-stat">
                <div class="garmin-stat-value {bb_color}">{bb}</div>
                <div class="garmin-stat-label">Body Battery</div>
            </div>
            <div class="garmin-stat">
                <div class="garmin-stat-value blue">{sleep}h</div>
                <div class="garmin-stat-label">שינה</div>
            </div>
            <div class="garmin-stat">
                <div class="garmin-stat-value {stress_color}">{stress}</div>
                <div class="garmin-stat-label">סטרס</div>
            </div>
            <div class="garmin-stat">
                <div class="garmin-stat-value">{steps:,}</div>
                <div class="garmin-stat-label">צעדים</div>
            </div>
        </div>
    </div>"""
