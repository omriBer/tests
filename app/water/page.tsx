"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  addGlasses, removeWaterEntry, getTodayEntries, getTodayGlasses, getTodayMl,
  getPreMealDone, getEatingWindow, startEatingWindow, resetEatingWindow,
  setEatingWindowDuration, getLeptinStartDate, setLeptinStartDate, getLeptinPhase,
  DAILY_GOAL_GLASSES, GLASS_ML,
  type PreMealType, type WaterEntry,
} from "@/lib/waterStorage";

// ─── Water drops visual ──────────────────────────────────────────────────────
function WaterDrops({ filled, total }: { filled: number; total: number }) {
  const pct = filled / total;
  const color = pct < 0.5 ? "#00B8FF" : pct < 0.85 ? "#00E676" : "#FFD60A";

  return (
    <div className="flex flex-col items-center my-4">
      <div className="relative flex items-center justify-center mb-3">
        {/* Big drop SVG with fill */}
        <svg width="120" height="140" viewBox="0 0 120 140">
          <defs>
            <clipPath id="dropClip">
              <path d="M60 8 C60 8 10 60 10 90 C10 118 33 132 60 132 C87 132 110 118 110 90 C110 60 60 8 60 8Z" />
            </clipPath>
          </defs>
          {/* Drop outline */}
          <path
            d="M60 8 C60 8 10 60 10 90 C10 118 33 132 60 132 C87 132 110 118 110 90 C110 60 60 8 60 8Z"
            fill="rgba(0,184,255,0.08)"
            stroke="rgba(0,184,255,0.3)"
            strokeWidth="2"
          />
          {/* Fill */}
          <rect
            x="0" y={140 - 124 * Math.min(pct, 1)} width="120" height="140"
            fill={color}
            fillOpacity="0.25"
            clipPath="url(#dropClip)"
            style={{ transition: "y 0.6s ease, fill 0.4s ease" }}
          />
          {/* Shine */}
          <ellipse cx="42" cy="65" rx="8" ry="14" fill="white" fillOpacity="0.12" />
        </svg>
        {/* Center text */}
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-black" style={{ color }}>{filled}</span>
          <span className="text-xs text-[#8B949E]">/ {total}</span>
        </div>
      </div>

      {/* Glass dots row */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all duration-300"
            style={{
              background: i < filled ? color : "rgba(255,255,255,0.08)",
              boxShadow: i < filled ? `0 0 6px ${color}60` : "none",
            }}
          />
        ))}
      </div>

      <p className="text-[#8B949E] text-xs mt-2">
        {getTodayMl()} מ&quot;ל מתוך {DAILY_GOAL_GLASSES * GLASS_ML} מ&quot;ל
      </p>
    </div>
  );
}

// ─── Eating window display ────────────────────────────────────────────────────
function EatingWindowSection({ onUpdate }: { onUpdate: () => void }) {
  const [window, setWindowState] = useState(getEatingWindow);
  const [now, setNow] = useState(Date.now());
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleStart() {
    startEatingWindow(window.durationHours);
    setWindowState(getEatingWindow());
    onUpdate();
  }

  function handleReset() {
    resetEatingWindow();
    setWindowState(getEatingWindow());
    onUpdate();
  }

  function handleDuration(h: number) {
    setEatingWindowDuration(h);
    setWindowState(getEatingWindow());
    setShowDurationPicker(false);
  }

  const endTime = window.start ? window.start + window.durationHours * 3_600_000 : null;
  const elapsed = window.start ? now - window.start : 0;
  const remaining = endTime ? endTime - now : 0;
  const windowPct = window.start ? Math.min(elapsed / (window.durationHours * 3_600_000), 1) : 0;
  const isOpen = !!window.start && remaining > 0;
  const isClosed = !!window.start && remaining <= 0;

  function fmt(ms: number) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}ש' ${m}ד'` : `${m}ד'`;
  }

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }

  const barColor = windowPct < 0.7 ? "#00E676" : windowPct < 0.9 ? "#FFD60A" : "#FF5252";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 mb-3"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold">⏰ חלון אכילה</span>
        <button
          onClick={() => setShowDurationPicker(!showDurationPicker)}
          className="text-xs text-[#8B949E] glass px-2 py-1 rounded-full"
        >
          {window.durationHours}ש&apos;
        </button>
      </div>

      {showDurationPicker && (
        <div className="flex gap-2 mb-3 justify-center">
          {[8, 10, 12].map((h) => (
            <button
              key={h}
              onClick={() => handleDuration(h)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                window.durationHours === h ? "bg-[#00E676] text-black" : "glass glass-hover"
              }`}
            >
              {h}ש&apos;
            </button>
          ))}
        </div>
      )}

      {!window.start && (
        <button
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-[#00E676] text-black font-black text-sm active:scale-95 transition-transform"
        >
          פתח חלון אכילה
        </button>
      )}

      {isOpen && (
        <>
          <div className="flex justify-between text-xs text-[#8B949E] mb-1">
            <span>נפתח: {fmtTime(window.start!)}</span>
            <span>נסגר: {fmtTime(endTime!)}</span>
          </div>
          <div className="h-2 bg-[#30363D] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${windowPct * 100}%`, background: barColor }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold" style={{ color: barColor }}>
              {remaining > 0 ? `נותרו ${fmt(remaining)}` : "החלון נסגר"}
            </span>
            <button onClick={handleReset} className="text-xs text-[#8B949E] hover:text-[#FF5252]">
              איפוס
            </button>
          </div>
        </>
      )}

      {isClosed && (
        <div className="text-center py-2">
          <p className="text-[#FF5252] font-bold text-sm mb-2">החלון נסגר</p>
          <button
            onClick={handleReset}
            className="text-xs text-[#8B949E] glass px-3 py-1 rounded-full"
          >
            פתח מחדש מחר
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Pre-meal water section ──────────────────────────────────────────────────
const PRE_MEAL_LABELS: Record<PreMealType, { label: string; icon: string }> = {
  breakfast: { label: "בוקר", icon: "🌅" },
  lunch:     { label: "צהריים", icon: "🌞" },
  dinner:    { label: "ערב", icon: "🌙" },
};

function PreMealSection({ onUpdate }: { onUpdate: () => void }) {
  const [done, setDone] = useState(getPreMealDone);

  function handleMeal(meal: PreMealType) {
    if (done[meal]) return;
    addGlasses(2, meal);
    setDone(getPreMealDone());
    onUpdate();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 mb-3"
    >
      <p className="font-bold mb-1">💧 2 כוסות לפני ארוחה</p>
      <p className="text-xs text-[#8B949E] mb-3">כלל מרכזי בשיטה הלפטינית</p>
      <div className="flex gap-2">
        {(Object.keys(PRE_MEAL_LABELS) as PreMealType[]).map((meal) => {
          const { label, icon } = PRE_MEAL_LABELS[meal];
          const isDone = done[meal];
          return (
            <button
              key={meal}
              onClick={() => handleMeal(meal)}
              className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 font-bold text-sm ${
                isDone
                  ? "bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676]"
                  : "glass glass-hover text-[#8B949E]"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
              {isDone && <span className="text-xs">✓</span>}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Leptin phase card ───────────────────────────────────────────────────────
function LeptinPhaseCard() {
  const [startDate, setStartDateState] = useState<string | null>(null);
  const [inputDate, setInputDate] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    setStartDateState(getLeptinStartDate());
  }, []);

  const phase = getLeptinPhase(startDate);

  function handleSave() {
    if (!inputDate) return;
    setLeptinStartDate(inputDate);
    setStartDateState(inputDate);
    setShowInput(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 mb-3"
      style={{ borderColor: `${phase.color}30` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold" style={{ color: phase.color }}>{phase.name}</span>
          <span className="text-[#8B949E] text-xs mr-2">{phase.weeks}</span>
          {startDate && (
            <span className="text-xs text-[#8B949E]"> · שבוע {phase.week}</span>
          )}
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="text-xs text-[#8B949E] glass px-2 py-1 rounded-full"
        >
          {startDate ? "עדכן" : "הגדר תאריך"}
        </button>
      </div>

      {showInput && (
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="flex-1 bg-[#161B22] border border-[#30363D] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00E676] text-white"
          />
          <button
            onClick={handleSave}
            disabled={!inputDate}
            className="px-4 py-2 bg-[#00E676] text-black font-black rounded-xl disabled:opacity-30 text-sm"
          >
            שמור
          </button>
        </div>
      )}

      <ul className="space-y-1.5">
        {phase.rules.map((rule, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#CDD9E5]">
            <span style={{ color: phase.color }} className="mt-0.5 shrink-0">›</span>
            {rule}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── History list ────────────────────────────────────────────────────────────
function TodayHistory({ entries, onRemove }: { entries: WaterEntry[]; onRemove: (id: string) => void }) {
  if (entries.length === 0) return null;

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 mb-3"
    >
      <p className="font-bold mb-2 text-sm">היסטוריית היום</p>
      {entries.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between py-1.5 border-b border-[#30363D]/40 last:border-0"
        >
          <span className="text-sm text-[#CDD9E5]">
            {e.preMeal ? `💧×${e.glasses} לפני ${PRE_MEAL_LABELS[e.preMeal as PreMealType]?.label}` : `💧×${e.glasses}`}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#8B949E]">{fmtTime(e.timestamp)}</span>
            <button
              onClick={() => onRemove(e.id)}
              className="text-[#8B949E] hover:text-[#FF5252] transition-colors text-sm"
            >✕</button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function WaterPage() {
  const [glasses, setGlasses] = useState(0);
  const [entries, setEntries] = useState<WaterEntry[]>([]);

  function refresh() {
    setGlasses(getTodayGlasses());
    setEntries(getTodayEntries());
  }

  useEffect(() => { refresh(); }, []);

  const handleAdd = useCallback((count: number) => {
    addGlasses(count);
    refresh();
  }, []);

  const handleRemove = useCallback((id: string) => {
    removeWaterEntry(id);
    refresh();
  }, []);

  const dateStr = new Date().toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long",
  });

  const pct = glasses / DAILY_GOAL_GLASSES;
  const goalColor = pct < 0.5 ? "#00B8FF" : pct < 0.85 ? "#00E676" : "#FFD60A";

  return (
    <main className="min-h-dvh px-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between py-5">
        <Link
          href="/"
          className="text-[#8B949E] hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          → חזרה
        </Link>
        <h1 className="font-bold text-lg">מעקב שתיה 💧</h1>
        <span className="text-[#8B949E] text-xs text-left">{dateStr}</span>
      </div>

      {/* Water drop visual */}
      <WaterDrops filled={Math.min(glasses, DAILY_GOAL_GLASSES)} total={DAILY_GOAL_GLASSES} />

      {/* Quick add buttons */}
      <div className="flex gap-3 mb-4 justify-center">
        {[1, 2, 3].map((count) => (
          <motion.button
            key={count}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAdd(count)}
            className="flex-1 py-4 glass glass-hover rounded-2xl flex flex-col items-center gap-1 font-bold"
            style={{ color: goalColor }}
          >
            <span className="text-2xl">{"💧".repeat(count)}</span>
            <span className="text-sm">+{count} כוס{count > 1 ? "ות" : ""}</span>
          </motion.button>
        ))}
      </div>

      {/* Status text */}
      {glasses >= DAILY_GOAL_GLASSES ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-4 py-3 glass"
          style={{ borderColor: "#FFD60A40" }}
        >
          <p className="font-black text-lg" style={{ color: "#FFD60A" }}>🎉 הגעת ליעד היומי!</p>
          <p className="text-xs text-[#8B949E]">2.5 ליטר מים – מעולה</p>
        </motion.div>
      ) : (
        <p className="text-center text-xs text-[#8B949E] mb-4">
          נותרו עוד {DAILY_GOAL_GLASSES - glasses} כוסות ליעד
        </p>
      )}

      {/* Pre-meal section */}
      <PreMealSection onUpdate={refresh} />

      {/* Eating window */}
      <EatingWindowSection onUpdate={refresh} />

      {/* Leptin phase */}
      <LeptinPhaseCard />

      {/* History */}
      <TodayHistory entries={entries} onRemove={handleRemove} />
    </main>
  );
}
