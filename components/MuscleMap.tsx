"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onSelect: (muscle: string) => void;
}

type MuscleKey = "חזה" | "גב" | "כתפיים" | "זרועות" | "בטן" | "רגליים";

const ACTIVE = "#00E676";
const BODY = "#30363D";
const BODY_OUTLINE = "#484F58";

interface ZonePath {
  tag: "path" | "ellipse" | "rect" | "line";
  attrs: Record<string, string | number>;
}

const ZONES: Record<MuscleKey, ZonePath[]> = {
  "חזה": [
    { tag: "path", attrs: { d: "M78,62 L122,62 L120,90 L80,90 Z" } },
    { tag: "ellipse", attrs: { cx: 92, cy: 76, rx: 10, ry: 12 } },
    { tag: "ellipse", attrs: { cx: 108, cy: 76, rx: 10, ry: 12 } },
  ],
  "גב": [
    { tag: "path", attrs: { d: "M78,62 L122,62 L120,95 L80,95 Z" } },
    { tag: "rect", attrs: { x: 85, y: 65, width: 30, height: 28, rx: 4 } },
  ],
  "כתפיים": [
    { tag: "ellipse", attrs: { cx: 68, cy: 62, rx: 12, ry: 9 } },
    { tag: "ellipse", attrs: { cx: 132, cy: 62, rx: 12, ry: 9 } },
  ],
  "זרועות": [
    { tag: "path", attrs: { d: "M55,62 L42,100 L48,104 L62,80 L70,64 Z" } },
    { tag: "path", attrs: { d: "M145,62 L158,100 L152,104 L138,80 L130,64 Z" } },
    { tag: "ellipse", attrs: { cx: 52, cy: 82, rx: 7, ry: 14 } },
    { tag: "ellipse", attrs: { cx: 148, cy: 82, rx: 7, ry: 14 } },
  ],
  "בטן": [
    { tag: "rect", attrs: { x: 84, y: 90, width: 32, height: 38, rx: 5 } },
  ],
  "רגליים": [
    { tag: "path", attrs: { d: "M75,130 L70,170 L65,210 L76,210 L80,170 L88,130 Z" } },
    { tag: "path", attrs: { d: "M125,130 L130,170 L135,210 L124,210 L120,170 L112,130 Z" } },
    { tag: "ellipse", attrs: { cx: 78, cy: 155, rx: 9, ry: 18 } },
    { tag: "ellipse", attrs: { cx: 122, cy: 155, rx: 9, ry: 18 } },
  ],
};

// Clickable hit areas for each muscle (larger invisible zones for touch)
const HIT_AREAS: Record<MuscleKey, { x: number; y: number; w: number; h: number }> = {
  "חזה": { x: 75, y: 58, w: 50, h: 35 },
  "גב": { x: 75, y: 58, w: 50, h: 40 },
  "כתפיים": { x: 54, y: 50, w: 92, h: 24 },
  "זרועות": { x: 35, y: 58, w: 130, h: 50 },
  "בטן": { x: 80, y: 88, w: 40, h: 44 },
  "רגליים": { x: 58, y: 128, w: 84, h: 86 },
};

function ZoneElement({ zone, color }: { zone: ZonePath; color: string }) {
  const baseAttrs = { fill: color, opacity: 0.85 };

  switch (zone.tag) {
    case "path":
      return <path {...baseAttrs} d={zone.attrs.d as string} />;
    case "ellipse":
      return (
        <ellipse
          {...baseAttrs}
          cx={zone.attrs.cx as number}
          cy={zone.attrs.cy as number}
          rx={zone.attrs.rx as number}
          ry={zone.attrs.ry as number}
        />
      );
    case "rect":
      return (
        <rect
          {...baseAttrs}
          x={zone.attrs.x as number}
          y={zone.attrs.y as number}
          width={zone.attrs.width as number}
          height={zone.attrs.height as number}
          rx={zone.attrs.rx as number}
        />
      );
    default:
      return null;
  }
}

export default function MuscleMap({ onSelect }: Props) {
  const [hovered, setHovered] = useState<MuscleKey | null>(null);

  const muscles: MuscleKey[] = ["חזה", "גב", "כתפיים", "זרועות", "בטן", "רגליים"];

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-dvh">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-2 neon-text"
      >
        מה מאמנים?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[#8B949E] text-sm mb-4"
      >
        לחץ על קבוצת שרירים
      </motion.p>

      {/* SVG Body Map */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative mb-6"
      >
        <svg
          viewBox="20 5 160 255"
          width="220"
          height="308"
          className="drop-shadow-lg"
        >
          {/* Body base */}
          <g
            fill={BODY}
            stroke={BODY_OUTLINE}
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <ellipse cx={100} cy={30} rx={16} ry={20} />
            <rect x={93} y={48} width={14} height={10} rx={3} />
            <path d="M70,58 L130,58 L125,130 L75,130 Z" />
            <path d="M70,58 L55,62 L42,100 L38,130 L48,132 L56,105 L62,80 L70,70" />
            <path d="M130,58 L145,62 L158,100 L162,130 L152,132 L144,105 L138,80 L130,70" />
            <path d="M75,130 L70,170 L65,210 L60,248 L76,248 L80,210 L82,170 L88,130" />
            <path d="M125,130 L130,170 L135,210 L140,248 L124,248 L120,210 L118,170 L112,130" />
          </g>

          {/* Active muscle zones */}
          {hovered &&
            ZONES[hovered]?.map((zone, i) => (
              <ZoneElement key={i} zone={zone} color={ACTIVE} />
            ))}

          {/* Neon glow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Hit areas */}
          {muscles.map((muscle) => {
            const area = HIT_AREAS[muscle];
            return (
              <rect
                key={muscle}
                x={area.x}
                y={area.y}
                width={area.w}
                height={area.h}
                fill="transparent"
                cursor="pointer"
                onMouseEnter={() => setHovered(muscle)}
                onMouseLeave={() => setHovered(null)}
                onTouchStart={() => setHovered(muscle)}
                onClick={() => onSelect(muscle)}
              />
            );
          })}
        </svg>

        {/* Label */}
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#00E676] text-black text-sm font-bold px-3 py-1 rounded-full"
          >
            {hovered}
          </motion.div>
        )}
      </motion.div>

      {/* Quick buttons */}
      <div className="flex gap-3 w-full max-w-md">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect("גוף מלא")}
          className="glass glass-hover no-select flex-1 p-4 text-center font-bold"
        >
          💪 גוף מלא
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect("הפתעה")}
          className="glass glass-hover no-select flex-1 p-4 text-center font-bold"
        >
          🎲 הפתעה
        </motion.button>
      </div>
    </div>
  );
}
