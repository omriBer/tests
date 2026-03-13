"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  addMeal, removeMeal, getTodayByMeal, getTodayTotal,
  MEAL_CONFIG, DAILY_GOAL,
  type MealType, type MealEntry,
} from "@/lib/mealStorage";

// ─── טבעת קלוריות ────────────────────────────────────────────────────
function CalorieRing({ total }: { total: number }) {
  const pct = Math.min(total / DAILY_GOAL, 1);
  const r = 75;
  const C = 2 * Math.PI * r;
  const color =
    pct < 0.6 ? "#00E676" : pct < 0.85 ? "#FFD60A" : pct < 1 ? "#FF6B35" : "#FF5252";

  return (
    <div className="relative flex items-center justify-center my-4">
      <svg width="180" height="180" className="-rotate-90" aria-hidden>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#30363D" strokeWidth="10" />
        <circle
          cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-4xl font-black" style={{ color }}>{total}</span>
        <span className="text-[#8B949E] text-xs">מתוך {DAILY_GOAL} קל</span>
        <span className="text-[#8B949E] text-xs mt-0.5">
          נשארו {Math.max(DAILY_GOAL - total, 0)} קל
        </span>
      </div>
    </div>
  );
}

// ─── Modal הוספת מנה ─────────────────────────────────────────────────
const QUICK_CALS = [100, 200, 300, 400, 500, 600];

function AddModal({
  meal, onAdd, onClose,
}: {
  meal: MealType;
  onAdd: (name: string, cal: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const cfg = MEAL_CONFIG[meal];

  function submit(calories: number) {
    if (calories <= 0) return;
    onAdd(name, calories);
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        className="relative w-full glass rounded-t-3xl p-6 pb-10"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
      >
        <h3 className="text-center font-bold text-lg mb-5">
          {cfg.icon} הוסף ל{cfg.label}
        </h3>

        {/* כפתורים מהירים */}
        <div className="flex gap-2 mb-5 justify-center flex-wrap">
          {QUICK_CALS.map((c) => (
            <button
              key={c} onClick={() => submit(c)}
              className="px-4 py-2 rounded-full glass glass-hover text-sm font-bold neon-text"
            >
              {c}
            </button>
          ))}
        </div>

        {/* הזנה חופשית */}
        <div className="flex gap-2">
          <input
            type="text" placeholder="שם המנה (אופציונלי)"
            value={name} onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-[#161B22] border border-[#30363D] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#00E676] text-white placeholder-[#8B949E]"
          />
          <input
            type="number" placeholder="קל" inputMode="numeric"
            value={cal} onChange={(e) => setCal(e.target.value)}
            className="w-24 bg-[#161B22] border border-[#30363D] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#00E676] text-white placeholder-[#8B949E]"
          />
          <button
            onClick={() => submit(parseInt(cal) || 0)}
            disabled={!cal || parseInt(cal) <= 0}
            className="px-4 py-3 bg-[#00E676] text-black font-black rounded-xl disabled:opacity-30 active:scale-95 transition-transform text-lg"
          >
            +
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── סקציית ארוחה ────────────────────────────────────────────────────
function MealSection({
  mealType, entries, onAdd, onRemove,
}: {
  mealType: MealType;
  entries: MealEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const cfg = MEAL_CONFIG[mealType];
  const total = entries.reduce((s, e) => s + e.calories, 0);
  const pct = Math.min(total / cfg.budget, 1);
  const barColor =
    pct < 0.8 ? "bg-[#00E676]" : pct < 1 ? "bg-yellow-400" : "bg-[#FF5252]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 mb-3"
    >
      {/* כותרת */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <span className="font-bold">{cfg.label}</span>
          <span className="text-[#8B949E] text-xs">({cfg.budget} קל)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${total > cfg.budget ? "text-[#FF5252]" : "text-[#00E676]"}`}>
            {total} קל
          </span>
          <button
            onClick={onAdd}
            className="w-7 h-7 rounded-full bg-[#00E676] text-black font-black text-base flex items-center justify-center active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
      </div>

      {/* פס התקדמות */}
      <div className="h-1.5 bg-[#30363D] rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {/* רשימת מנות */}
      {entries.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between py-1.5 border-b border-[#30363D]/40 last:border-0"
        >
          <span className="text-sm text-white">{e.name}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#8B949E]">{e.calories} קל</span>
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

// ─── טיפ חכם לפי יתרת קלוריות ────────────────────────────────────────
const SUGGESTIONS = [
  { name: "סלט עוף גריל",     calories: 350 },
  { name: "ביצה + לחם",       calories: 280 },
  { name: "יוגורט + פרי",     calories: 200 },
  { name: "טונה + פיתה",      calories: 320 },
  { name: "חביתה עם ירקות",   calories: 250 },
  { name: "גבינה לבנה + ירקות", calories: 180 },
  { name: "שיבולת שועל",       calories: 300 },
];

function SmartTip({ remaining }: { remaining: number }) {
  if (remaining > 650 || remaining <= 0) return null;
  const fits = SUGGESTIONS.filter((s) => s.calories <= remaining).slice(0, 3);
  if (fits.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 mb-4 border border-[#FFD60A]/30"
    >
      <p className="text-sm font-bold mb-2" style={{ color: "#FFD60A" }}>
        💡 נשארו {remaining} קל – הנה אפשרויות לערב:
      </p>
      {fits.map((s) => (
        <div key={s.name} className="flex justify-between text-sm py-1">
          <span className="text-white">{s.name}</span>
          <span className="text-[#8B949E]">{s.calories} קל</span>
        </div>
      ))}
    </motion.div>
  );
}

// ─── עמוד ראשי ────────────────────────────────────────────────────────
export default function MealsPage() {
  const [byMeal, setByMeal] = useState<Record<MealType, MealEntry[]>>(getTodayByMeal);
  const [total, setTotal] = useState<number>(getTodayTotal);
  const [addingTo, setAddingTo] = useState<MealType | null>(null);

  function refresh() {
    setByMeal(getTodayByMeal());
    setTotal(getTodayTotal());
  }

  function handleAdd(name: string, calories: number) {
    if (!addingTo) return;
    addMeal(addingTo, name, calories);
    refresh();
  }

  function handleRemove(id: string) {
    removeMeal(id);
    refresh();
  }

  const dateStr = new Date().toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long",
  });

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
        <h1 className="font-bold text-lg">מעקב ארוחות 🍽</h1>
        <span className="text-[#8B949E] text-xs text-left">{dateStr}</span>
      </div>

      {/* טבעת קלוריות */}
      <CalorieRing total={total} />

      {/* טיפ חכם */}
      <SmartTip remaining={DAILY_GOAL - total} />

      {/* סקציות ארוחה */}
      {(Object.keys(MEAL_CONFIG) as MealType[]).map((mealType) => (
        <MealSection
          key={mealType}
          mealType={mealType}
          entries={byMeal[mealType]}
          onAdd={() => setAddingTo(mealType)}
          onRemove={handleRemove}
        />
      ))}

      {/* Modal הוספת מנה */}
      <AnimatePresence>
        {addingTo && (
          <AddModal
            meal={addingTo}
            onAdd={handleAdd}
            onClose={() => setAddingTo(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
