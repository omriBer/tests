"""
FitnessMate - Muscle Group SVG Illustrations
Inline SVG body maps with highlighted muscle groups.
Each function returns an HTML string with an embedded SVG.
"""

import base64

def _svg_to_img(svg: str, size: int) -> str:
    """Convert raw SVG string to a base64 <img> tag for reliable rendering."""
    b64 = base64.b64encode(svg.encode("utf-8")).decode("utf-8")
    return f'<img src="data:image/svg+xml;base64,{b64}" width="{size}" height="{int(size * 1.4)}" style="display:block;margin:auto;" />'

# Highlight color for active muscle
_ACTIVE = "#4CAF50"
_ACTIVE_LIGHT = "#81C784"
_BODY = "#D7CCC8"
_BODY_OUTLINE = "#8D6E63"
_CARDIO = "#EF5350"

# Base body outline paths (front view, simplified anatomical figure)
_HEAD = '<ellipse cx="100" cy="30" rx="16" ry="20" />'
_NECK = '<rect x="93" y="48" width="14" height="10" rx="3" />'
_TORSO = '<path d="M70,58 L130,58 L125,130 L75,130 Z" />'
_L_ARM = '<path d="M70,58 L55,62 L42,100 L38,130 L48,132 L56,105 L62,80 L70,70" />'
_R_ARM = '<path d="M130,58 L145,62 L158,100 L162,130 L152,132 L144,105 L138,80 L130,70" />'
_L_LEG = '<path d="M75,130 L70,170 L65,210 L60,248 L76,248 L80,210 L82,170 L88,130" />'
_R_LEG = '<path d="M125,130 L130,170 L135,210 L140,248 L124,248 L120,210 L118,170 L112,130" />'

# Highlighted zone paths for each muscle group
_ZONES = {
    "חזה": [
        '<path d="M78,62 L122,62 L120,90 L80,90 Z" fill="{c}" opacity="0.85"/>',
        '<ellipse cx="92" cy="76" rx="10" ry="12" fill="{c}" opacity="0.9"/>',
        '<ellipse cx="108" cy="76" rx="10" ry="12" fill="{c}" opacity="0.9"/>',
    ],
    "גב": [
        '<path d="M78,62 L122,62 L120,95 L80,95 Z" fill="{c}" opacity="0.8"/>',
        '<rect x="85" y="65" width="30" height="28" rx="4" fill="{c}" opacity="0.7"/>',
        '<line x1="100" y1="62" x2="100" y2="95" stroke="{d}" stroke-width="2" opacity="0.5"/>',
    ],
    "כתפיים": [
        '<ellipse cx="68" cy="62" rx="12" ry="9" fill="{c}" opacity="0.85"/>',
        '<ellipse cx="132" cy="62" rx="12" ry="9" fill="{c}" opacity="0.85"/>',
    ],
    "זרועות": [
        '<path d="M55,62 L42,100 L48,104 L62,80 L70,64 Z" fill="{c}" opacity="0.8"/>',
        '<path d="M145,62 L158,100 L152,104 L138,80 L130,64 Z" fill="{c}" opacity="0.8"/>',
        '<ellipse cx="52" cy="82" rx="7" ry="14" fill="{c}" opacity="0.85"/>',
        '<ellipse cx="148" cy="82" rx="7" ry="14" fill="{c}" opacity="0.85"/>',
    ],
    "בטן": [
        '<rect x="84" y="90" width="32" height="38" rx="5" fill="{c}" opacity="0.8"/>',
        '<line x1="100" y1="92" x2="100" y2="126" stroke="{d}" stroke-width="1.5" opacity="0.4"/>',
        '<line x1="86" y1="100" x2="114" y2="100" stroke="{d}" stroke-width="1" opacity="0.3"/>',
        '<line x1="86" y1="110" x2="114" y2="110" stroke="{d}" stroke-width="1" opacity="0.3"/>',
        '<line x1="86" y1="120" x2="114" y2="120" stroke="{d}" stroke-width="1" opacity="0.3"/>',
    ],
    "רגליים": [
        '<path d="M75,130 L70,170 L65,210 L76,210 L80,170 L88,130 Z" fill="{c}" opacity="0.8"/>',
        '<path d="M125,130 L130,170 L135,210 L124,210 L120,170 L112,130 Z" fill="{c}" opacity="0.8"/>',
        '<ellipse cx="78" cy="155" rx="9" ry="18" fill="{c}" opacity="0.7"/>',
        '<ellipse cx="122" cy="155" rx="9" ry="18" fill="{c}" opacity="0.7"/>',
    ],
    "גוף מלא": [
        '<path d="M78,62 L122,62 L120,128 L80,128 Z" fill="{c}" opacity="0.6"/>',
        '<path d="M55,62 L42,100 L48,104 L62,80 L70,64 Z" fill="{c}" opacity="0.6"/>',
        '<path d="M145,62 L158,100 L152,104 L138,80 L130,64 Z" fill="{c}" opacity="0.6"/>',
        '<path d="M75,130 L70,170 L65,210 L76,210 L80,170 L88,130 Z" fill="{c}" opacity="0.6"/>',
        '<path d="M125,130 L130,170 L135,210 L124,210 L120,170 L112,130 Z" fill="{c}" opacity="0.6"/>',
        '<ellipse cx="68" cy="62" rx="12" ry="9" fill="{c}" opacity="0.6"/>',
        '<ellipse cx="132" cy="62" rx="12" ry="9" fill="{c}" opacity="0.6"/>',
    ],
}

# Cardio zone - heart + legs lightly
_CARDIO_ZONE = [
    '<path d="M75,130 L70,170 L65,210 L76,210 L80,170 L88,130 Z" fill="{c}" opacity="0.5"/>',
    '<path d="M125,130 L130,170 L135,210 L124,210 L120,170 L112,130 Z" fill="{c}" opacity="0.5"/>',
    # Heart icon in center chest
    '<path d="M93,72 C93,68 88,64 88,68 C88,64 83,68 83,72 C83,78 88,82 88,82 C88,82 93,78 93,72 Z" '
    'fill="{h}" opacity="0.9" transform="translate(12,-2) scale(1.3)"/>',
]


def _build_svg(muscle: str, size: int = 120, active_color: str = _ACTIVE) -> str:
    """Build a complete SVG body map with a highlighted muscle group."""
    dark = active_color.replace("50", "30") if "50" in active_color else "#2E7D32"

    body_parts = f"""
    <g fill="{_BODY}" stroke="{_BODY_OUTLINE}" stroke-width="1.5" stroke-linejoin="round">
        {_HEAD}
        {_NECK}
        {_TORSO}
        {_L_ARM}
        {_R_ARM}
        {_L_LEG}
        {_R_LEG}
    </g>
    """

    zones = _ZONES.get(muscle, [])
    zone_svg = "\n".join(
        z.replace("{c}", active_color).replace("{d}", dark)
        for z in zones
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 5 160 255"
         width="{size}" height="{int(size * 1.4)}"
         style="display:block;margin:auto;">
        {body_parts}
        {zone_svg}
    </svg>"""

    return _svg_to_img(svg, size)


def _build_cardio_svg(size: int = 120) -> str:
    """Build SVG for cardio/endurance workouts (heart + legs)."""
    body_parts = f"""
    <g fill="{_BODY}" stroke="{_BODY_OUTLINE}" stroke-width="1.5" stroke-linejoin="round">
        {_HEAD}
        {_NECK}
        {_TORSO}
        {_L_ARM}
        {_R_ARM}
        {_L_LEG}
        {_R_LEG}
    </g>
    """

    zone_svg = "\n".join(
        z.replace("{c}", _ACTIVE_LIGHT).replace("{h}", _CARDIO)
        for z in _CARDIO_ZONE
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 5 160 255"
         width="{size}" height="{int(size * 1.4)}"
         style="display:block;margin:auto;">
        {body_parts}
        {zone_svg}
    </svg>"""

    return _svg_to_img(svg, size)


def get_muscle_svg(muscle: "str | None", training_type: str = "כוח",
                   size: int = 120) -> str:
    """Get the SVG illustration for a given muscle/training type."""
    if training_type == "סיבולת" or muscle is None:
        return _build_cardio_svg(size)
    return _build_svg(muscle, size)


def get_muscle_card_html(muscle: str, is_selected: bool = False,
                         size: int = 80) -> str:
    """Get a complete HTML card with SVG + label for the muscle picker."""
    border_color = _ACTIVE if is_selected else "#E0E0E0"
    bg = "#E8F5E9" if is_selected else "#FFFFFF"
    shadow = "0 4px 16px rgba(76,175,80,0.25)" if is_selected else "0 2px 8px rgba(0,0,0,0.06)"
    check = '<span class="muscle-check">✓</span>' if is_selected else ""

    img = _build_svg(muscle, size)

    return f"""<div class="muscle-card" style="
        border:2px solid {border_color};
        background:{bg};
        box-shadow:{shadow};
        border-radius:16px;
        padding:8px 4px;
        text-align:center;
        position:relative;
        transition: all 0.2s ease;
        cursor:pointer;
        min-height:{size + 60}px;
    ">
        {check}
        {img}
        <div class="muscle-label">{muscle}</div>
    </div>"""


def get_workout_muscle_badge(workout: dict, size: int = 50) -> str:
    """Small inline muscle badge for dashboard cards."""
    muscle = workout.get("target_muscle")
    training_type = workout.get("training_type", "כוח")
    svg = get_muscle_svg(muscle, training_type, size)
    return f'<div class="muscle-badge">{svg}</div>'


def get_template_muscle_svg(template: dict, size: int = 60) -> str:
    """SVG for template cards."""
    muscle = template.get("target_muscle")
    training_type = template.get("training_type", "כוח")
    return get_muscle_svg(muscle, training_type, size)


# Mapping for cardio workout types that don't target specific muscles
CARDIO_TYPES = {"ריצה בחוץ", "כדורגל עם הבן", "אחר"}
