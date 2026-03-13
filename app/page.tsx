"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getTodayTotal, DAILY_GOAL } from "@/lib/mealStorage";
import { getTodayGlasses, DAILY_GOAL_GLASSES } from "@/lib/waterStorage";

function FitnessMateLogo() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 h-24 drop-shadow-[0_0_24px_rgba(0,230,118,0.6)]"
    >
      {/* Outer hexagon ring */}
      <polygon
        points="60,4 108,30 108,90 60,116 12,90 12,30"
        stroke="#00E676"
        strokeWidth="2.5"
        fill="rgba(0,230,118,0.06)"
        strokeLinejoin="round"
      />
      {/* Inner glow hexagon */}
      <polygon
        points="60,16 98,38 98,82 60,104 22,82 22,38"
        stroke="rgba(0,230,118,0.25)"
        strokeWidth="1"
        fill="none"
      />
      {/* Dumbbell bar */}
      <rect x="34" y="57" width="52" height="6" rx="3" fill="#00E676" />
      {/* Left weight plate outer */}
      <rect x="20" y="46" width="14" height="28" rx="5" fill="#00E676" />
      {/* Left weight plate inner */}
      <rect x="23" y="50" width="8" height="20" rx="3" fill="#0D1117" opacity="0.6" />
      {/* Right weight plate outer */}
      <rect x="86" y="46" width="14" height="28" rx="5" fill="#00E676" />
      {/* Right weight plate inner */}
      <rect x="89" y="50" width="8" height="20" rx="3" fill="#0D1117" opacity="0.6" />
      {/* Lightning bolt overlay */}
      <path
        d="M65 30 L54 60 H63 L55 90 L76 52 H66 Z"
        fill="#FFD60A"
        opacity="0.92"
        filter="url(#glow)"
      />
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
      />
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.1, duration: 0.45, ease: "easeOut" },
  }),
};

export default function HomePage() {
  const [calories, setCalories] = useState(0);
  const [glasses, setGlasses] = useState(0);

  useEffect(() => {
    setCalories(getTodayTotal());
    setGlasses(getTodayGlasses());
  }, []);

  const calPct = calories / DAILY_GOAL;
  const calColor =
    calPct === 0 ? "#8B949E" : calPct < 0.6 ? "#00E676" : calPct < 0.9 ? "#FFD60A" : "#FF5252";

  const waterPct = glasses / DAILY_GOAL_GLASSES;
  const waterColor =
    waterPct === 0 ? "#8B949E" : waterPct < 0.5 ? "#00B8FF" : waterPct < 0.9 ? "#00E676" : "#FFD60A";

  return (
    <main className="min-h-dvh flex flex-col items-center px-5 pt-16 pb-10">
      {/* Logo + title */}
      <motion.div
        className="flex flex-col items-center gap-4 mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <FitnessMateLogo />
        <div className="text-center">
          <h1 className="text-4xl font-black neon-text tracking-tight">FitnessMate</h1>
          <p className="text-[#8B949E] text-sm mt-1 font-medium">בחר מסלול והתחל</p>
        </div>
      </motion.div>

      {/* Nav cards */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Workout card */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
          <Link href="/workout" className="block">
            <div className="glass glass-hover rounded-2xl p-5 flex items-center gap-4 group">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.25)" }}
              >
                💪
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-white">אימון</span>
                  <span className="text-xs text-[#00E676] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    התחל ←
                  </span>
                </div>
                <p className="text-[#8B949E] text-xs">מצא את האימון המושלם לך</p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Meals card */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Link href="/meals" className="block">
            <div className="glass glass-hover rounded-2xl p-5 flex items-center gap-4 group">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: `rgba(${calPct > 0.9 ? "255,82,82" : calPct > 0.6 ? "255,214,10" : "0,230,118"},0.10)`,
                  border: `1px solid rgba(${calPct > 0.9 ? "255,82,82" : calPct > 0.6 ? "255,214,10" : "0,230,118"},0.22)`,
                }}
              >
                🍽
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg font-bold text-white">ארוחות</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: calColor }}>
                    {calories > 0 ? `${calories} / ${DAILY_GOAL} קל` : `0 / ${DAILY_GOAL} קל`}
                  </span>
                </div>
                <ProgressBar value={calories} max={DAILY_GOAL} color={calColor} />
                <p className="text-[#8B949E] text-xs mt-1.5">
                  {calories === 0
                    ? "עדיין לא נרשמו ארוחות היום"
                    : calories < DAILY_GOAL * 0.5
                    ? `נשארו ${DAILY_GOAL - calories} קל ליעד`
                    : calories < DAILY_GOAL
                    ? `${Math.round(calPct * 100)}% מהיעד היומי`
                    : "הגעת ליעד הקלורי!"}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Water card */}
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
          <Link href="/water" className="block">
            <div className="glass glass-hover rounded-2xl p-5 flex items-center gap-4 group">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: `rgba(${waterPct > 0.9 ? "255,214,10" : waterPct > 0.5 ? "0,230,118" : "0,184,255"},0.10)`,
                  border: `1px solid rgba(${waterPct > 0.9 ? "255,214,10" : waterPct > 0.5 ? "0,230,118" : "0,184,255"},0.22)`,
                }}
              >
                💧
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg font-bold text-white">שתיה</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: waterColor }}>
                    {glasses} / {DAILY_GOAL_GLASSES} כוסות
                  </span>
                </div>
                <ProgressBar value={glasses} max={DAILY_GOAL_GLASSES} color={waterColor} />
                <p className="text-[#8B949E] text-xs mt-1.5">
                  {glasses === 0
                    ? "עדיין לא שתית היום"
                    : glasses < DAILY_GOAL_GLASSES
                    ? `נשארו ${DAILY_GOAL_GLASSES - glasses} כוסות ליעד`
                    : "כל הכבוד! הגעת ליעד השתיה 🎉"}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.p
        className="mt-auto pt-10 text-[#30363D] text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        FitnessMate • {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
      </motion.p>
    </main>
  );
}
