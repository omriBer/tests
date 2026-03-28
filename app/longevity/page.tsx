"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Moon,
  Activity,
  ChevronRight,
  Check,
  Zap,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Timer,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrainingQuality = "blue" | "green" | "red" | null;

type DayLog = {
  date: string;
  hrv: number | "";          // HRV Status (ms) — Garmin
  rhr: number | "";          // Resting HR (bpm) — Garmin
  readiness: number | "";    // Training Readiness (0–100) — Garmin
  sleepScore: number | "";   // Sleep Score (0–100) — Garmin
  ate1900: boolean;          // האם אכלת אחרי 19:00?
  zone2Minutes: number;      // Zone 2 minutes today
  trainingQuality: TrainingQuality;
};

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "longevity_garmin_v1";

function loadLogs(): Record<string, DayLog> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveLogs(logs: Record<string, DayLog>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function emptyLog(date: string): DayLog {
  return {
    date, hrv: "", rhr: "", readiness: "", sleepScore: "",
    ate1900: false, zone2Minutes: 0, trainingQuality: null,
  };
}

const BIOHACK_TIPS = [
  "10 דקות אור שמש תוך שעה מהקימה מסדרות את הקצב הצירקדיאני.",
  "90 שניות מים קרים בסיום מקלחת מעלות HRV ומגבירות נוראדרנלין.",
  "נשימת קופסה 4-4-4-4 לפני שינה — מורידה קורטיזול.",
  "30g חלבון תוך 30 דקות מסיום אימון כוח — קריטי לסינתזת שריר.",
  "הליכה קלה 10 דקות אחרי ארוחה — מפחיתה גלוקוז בדם ב-25%.",
  "הורד חדר שינה ל-18°C — גוף צונן נכנס לשינה עמוקה מהר יותר.",
  "אמבטיית קרח 15 דקות אחרי כוח — מכפילה דופמין ל-3 שעות.",
];

// ─── Score Engine ─────────────────────────────────────────────────────────────
// Bio-Score = HRV(40%) + RHR(30%) + Readiness(20%) + Sleep(10%)
// Penalty: −20 if RHR > weekly avg + 5

function normalizeHRV(v: number) {
  if (v >= 50) return 100;
  if (v <= 20) return 0;
  return Math.round(((v - 20) / 30) * 100);
}

function normalizeRHR(v: number) {
  if (v <= 45) return 100;
  if (v >= 80) return 0;
  return Math.round(((80 - v) / 35) * 100);
}

type ScoreResult = {
  total: number;
  base: number;
  components: { hrv: number; rhr: number; readiness: number; sleep: number };
  hasData: boolean;
  rhrPenalty: boolean;
  weeklyRhrAvg: number | null;
};

function calcScore(today: DayLog, allLogs: Record<string, DayLog>): ScoreResult {
  const hrv       = today.hrv !== ""        ? Number(today.hrv)        : null;
  const rhr       = today.rhr !== ""        ? Number(today.rhr)        : null;
  const readiness = today.readiness !== ""  ? Number(today.readiness)  : null;
  const sleep     = today.sleepScore !== "" ? Number(today.sleepScore) : null;

  const hasData = hrv !== null || rhr !== null || readiness !== null || sleep !== null;

  const hrvNorm   = hrv       !== null ? normalizeHRV(hrv)  : 0;
  const rhrNorm   = rhr       !== null ? normalizeRHR(rhr)  : 0;
  const readNorm  = readiness !== null ? readiness           : 0;
  const sleepNorm = sleep     !== null ? sleep               : 0;

  const base = Math.round(hrvNorm * 0.40 + rhrNorm * 0.30 + readNorm * 0.20 + sleepNorm * 0.10);

  // RHR penalty vs 6-day average
  const prev6 = getLast7Dates().slice(0, 6);
  const rhrVals = prev6
    .map(d => allLogs[d]?.rhr)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const weeklyRhrAvg = rhrVals.length > 0
    ? Math.round(rhrVals.reduce((s, v) => s + v, 0) / rhrVals.length)
    : null;

  const rhrPenalty = rhr !== null && weeklyRhrAvg !== null && rhr > weeklyRhrAvg + 5;
  const total = Math.max(0, Math.min(100, base - (rhrPenalty ? 20 : 0)));

  return {
    total: hasData ? total : 0,
    base,
    components: { hrv: hrvNorm, rhr: rhrNorm, readiness: readNorm, sleep: sleepNorm },
    hasData,
    rhrPenalty,
    weeklyRhrAvg,
  };
}

// ─── Status ───────────────────────────────────────────────────────────────────

function getStatus(score: number) {
  if (score >= 80) return { label: "Prime — גוף מוכן לביצועים גבוהים", color: "#10b981", glow: "rgba(16,185,129,0.5)",  bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.2)"  };
  if (score >= 60) return { label: "Maintaining — שמור על הקצב",       color: "#3b82f6", glow: "rgba(59,130,246,0.5)",  bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.2)"  };
  if (score >= 40) return { label: "Recovery — הפחת עצימות",           color: "#f59e0b", glow: "rgba(245,158,11,0.45)", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)"  };
  return             { label: "Overreach — מנוחה מלאה",                color: "#ef4444", glow: "rgba(239,68,68,0.5)",   bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)"   };
}

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

function BioGauge({ score, color, glow }: { score: number; color: string; glow: string }) {
  const r    = 56;
  const cx   = 70;
  const cy   = 70;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  return (
    <svg width={140} height={140} viewBox="0 0 140 140" className="block shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={10} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: `${cx}px ${cy}px`,
          filter: `drop-shadow(0 0 10px ${glow})`,
          transition: "stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)",
        }}
      />
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        fill={color}
        fontSize={34}
        fontWeight={900}
        fontFamily="'SF Mono','Fira Code','Courier New',monospace"
        style={{ filter: `drop-shadow(0 0 12px ${glow})` }}
      >
        {score}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(100,116,139,0.7)" fontSize={11} fontWeight={600}>
        / 100
      </text>
    </svg>
  );
}

// ─── Recharts tooltip ─────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 border text-xs" style={{ background: "#0a111e", borderColor: "rgba(59,130,246,0.25)" }}>
      <p className="text-slate-500 mb-0.5">{label}</p>
      <p className="font-black" style={{ color: "#60a5fa" }}>{payload[0].value} pts</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LongevityPage() {
  const [logs, setLogs]       = useState<Record<string, DayLog>>({});
  const [today, setToday]     = useState<DayLog>(emptyLog(todayStr()));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadLogs();
    setLogs(stored);
    setToday(stored[todayStr()] ?? emptyLog(todayStr()));
    setMounted(true);
  }, []);

  const persistToday = useCallback((updated: DayLog) => {
    const next = { ...logs, [updated.date]: updated };
    setLogs(next);
    saveLogs(next);
  }, [logs]);

  const updateToday = useCallback((patch: Partial<DayLog>) => {
    const updated = { ...today, ...patch };
    setToday(updated);
    persistToday(updated);
  }, [today, persistToday]);

  const resetToday = useCallback(() => {
    const fresh = emptyLog(todayStr());
    setToday(fresh);
    const next = { ...logs, [fresh.date]: fresh };
    setLogs(next);
    saveLogs(next);
  }, [logs]);

  const allLogs = useMemo(() => ({ ...logs, [today.date]: today }), [logs, today]);

  const { total, components, hasData, rhrPenalty, weeklyRhrAvg } = calcScore(today, allLogs);
  const status = getStatus(total);

  const zone2Weekly = useMemo(
    () => getLast7Dates().reduce((s, d) => s + (allLogs[d]?.zone2Minutes ?? 0), 0),
    [allLogs],
  );

  const trendData = useMemo(
    () => getLast7Dates().map(d => {
      const log = allLogs[d];
      if (!log) return { day: d.slice(5), score: null };
      const { total: s, hasData: hd } = calcScore(log, allLogs);
      return { day: d.slice(5), score: hd ? s : null };
    }),
    [allLogs],
  );

  const dailyTip = BIOHACK_TIPS[new Date().getDay()];

  if (!mounted) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#050a12]">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#050a12] text-white" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(5,10,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(59,130,246,0.08)" }}
      >
        <div>
          <p className="text-xs font-black tracking-[0.22em] uppercase" style={{ color: "#3b82f6" }}>
            Garmin Bio-Dashboard
          </p>
          <p className="text-xs text-slate-700 mt-0.5">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/" className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-3 max-w-lg mx-auto">

        {/* ── Bio-Score Gauge ─────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 transition-all duration-500"
          style={{ background: status.bg, border: `1px solid ${status.border}` }}
        >
          <p className="text-xs font-black text-center tracking-[0.25em] text-slate-600 uppercase mb-4">
            Daily Bio-Score
          </p>

          <div className="flex items-center gap-5">
            <BioGauge score={total} color={status.color} glow={status.glow} />

            {/* Component breakdown */}
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              {([
                { label: "HRV",       val: components.hrv,       weight: "40%", color: "#ec4899" },
                { label: "RHR",       val: components.rhr,       weight: "30%", color: "#3b82f6" },
                { label: "Readiness", val: components.readiness, weight: "20%", color: "#10b981" },
                { label: "Sleep",     val: components.sleep,     weight: "10%", color: "#8b5cf6" },
              ] as const).map(({ label, val, weight, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">
                      {label} <span className="text-slate-800">{weight}</span>
                    </span>
                    <span className="font-black tabular-nums" style={{ color: val > 0 ? color : "#1e293b" }}>
                      {val}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${val}%`,
                        backgroundColor: color,
                        boxShadow: val > 0 ? `0 0 5px ${color}80` : "none",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs font-bold mt-4 transition-all duration-300" style={{ color: status.color }}>
            {hasData ? status.label : "הכנס נתוני גארמין לחישוב הציון"}
          </p>
        </div>

        {/* ── RHR Penalty Banner ───────────────────────────────────────────── */}
        {rhrPenalty && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)" }}
          >
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-black text-red-300">קנס דופק מנוחה</p>
              <p className="text-xs text-red-600 mt-0.5">
                RHR ({today.rhr} bpm) גבוה ב‑
                {weeklyRhrAvg !== null ? Math.round(Number(today.rhr) - weeklyRhrAvg) : "5"}+ פעימות מהממוצע
                השבועי ({weeklyRhrAvg} bpm) —{" "}
                <span className="font-black text-red-400">−20 נקודות</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Garmin Metric Cards (2×2) ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5">

          {/* HRV Status */}
          <GarminCard
            icon={<Heart size={12} className="text-pink-500" />}
            label="HRV Status"
            unit="ms"
            value={today.hrv}
            color="#ec4899"
            hint={today.hrv !== "" ? (Number(today.hrv) >= 50 ? "✓ Optimal" : Number(today.hrv) >= 35 ? "Fair" : "⚠ Low") : "יעד ≥ 50ms"}
            onChange={v => updateToday({ hrv: v })}
            min={0} max={200}
          />

          {/* Resting HR */}
          <GarminCard
            icon={<Activity size={12} className="text-blue-400" />}
            label="Resting HR"
            unit="bpm"
            value={today.rhr}
            color={rhrPenalty ? "#ef4444" : "#3b82f6"}
            warn={rhrPenalty}
            warnBadge="−20"
            hint={
              today.rhr !== ""
                ? (Number(today.rhr) <= 50 ? "✓ Excellent" : Number(today.rhr) <= 62 ? "Normal" : "High")
                : weeklyRhrAvg !== null ? `ממוצע 7d: ${weeklyRhrAvg}` : "יעד ≤ 55bpm"
            }
            onChange={v => updateToday({ rhr: v })}
            min={30} max={120}
          />

          {/* Training Readiness */}
          <GarminCard
            icon={<TrendingUp size={12} className="text-emerald-500" />}
            label="Readiness"
            unit="/ 100"
            value={today.readiness}
            color="#10b981"
            hint=""
            showBar
            onChange={v => updateToday({ readiness: v })}
            min={0} max={100}
          />

          {/* Sleep Score */}
          <GarminCard
            icon={<Moon size={12} className="text-violet-400" />}
            label="Sleep Score"
            unit="/ 100"
            value={today.sleepScore}
            color="#8b5cf6"
            hint=""
            showBar
            onChange={v => updateToday({ sleepScore: v })}
            min={0} max={100}
          />
        </div>

        {/* ── Performance Anchors ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-yellow-500" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">עוגני ביצוע</p>
          </div>

          {/* 19:00 Rule */}
          <div className="rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-200">19:00 Rule</p>
                <p className="text-xs text-slate-600 mt-0.5">האם אכלת אחרי 19:00?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateToday({ ate1900: false })}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                  style={!today.ate1900
                    ? { background: "rgba(16,185,129,0.18)", borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
                >
                  <Check size={11} className="inline mr-1" />לא
                </button>
                <button
                  onClick={() => updateToday({ ate1900: true })}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                  style={today.ate1900
                    ? { background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
                >
                  כן
                </button>
              </div>
            </div>
          </div>

          {/* Zone 2 Goal */}
          <div className="rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-sm font-bold text-slate-200">Zone 2 Goal</p>
                <p className="text-xs mt-0.5" style={{ color: zone2Weekly >= 150 ? "#10b981" : "#64748b" }}>
                  שבועי: {zone2Weekly} / 150 דק׳
                </p>
              </div>
              <span
                className="text-2xl font-black tabular-nums"
                style={{ fontFamily: "monospace", color: zone2Weekly >= 150 ? "#10b981" : "#3b82f6" }}
              >
                {today.zone2Minutes}<span className="text-sm text-slate-600">′</span>
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((zone2Weekly / 150) * 100, 100)}%`,
                  backgroundColor: zone2Weekly >= 150 ? "#10b981" : "#3b82f6",
                  boxShadow: `0 0 8px ${zone2Weekly >= 150 ? "rgba(16,185,129,0.5)" : "rgba(59,130,246,0.4)"}`,
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateToday({ zone2Minutes: Math.max(0, today.zone2Minutes - 15) })}
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg font-black text-slate-500 border border-white/8 bg-white/3 active:scale-95 transition-all"
              >−</button>
              <div className="flex gap-1.5 flex-1 justify-center">
                {[30, 45, 60, 90].map(m => (
                  <button
                    key={m}
                    onClick={() => updateToday({ zone2Minutes: m })}
                    className="flex-1 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95"
                    style={today.zone2Minutes === m
                      ? { background: "rgba(59,130,246,0.18)", borderColor: "rgba(59,130,246,0.4)", color: "#3b82f6" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
                  >{m}′</button>
                ))}
              </div>
              <button
                onClick={() => updateToday({ zone2Minutes: today.zone2Minutes + 15 })}
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg font-black text-blue-400 border border-blue-500/30 bg-blue-500/10 active:scale-95 transition-all"
              >+</button>
            </div>
          </div>

          {/* Training Quality */}
          <div className="rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-sm font-bold text-slate-200 mb-2.5">Training Quality</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "blue"  as const, emoji: "🔵", label: "Blue (Z2)",  desc: "קרדיו שומן",  color: "#3b82f6" },
                { key: "green" as const, emoji: "🟢", label: "Green (Z3)", desc: "סף אירובי",   color: "#10b981" },
                { key: "red"   as const, emoji: "🔴", label: "Red (Hard)", desc: "עצים / HIIT", color: "#ef4444" },
              ]).map(({ key, emoji, label, desc, color }) => (
                <button
                  key={key}
                  onClick={() => updateToday({ trainingQuality: today.trainingQuality === key ? null : key })}
                  className="py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all active:scale-95"
                  style={today.trainingQuality === key
                    ? { background: `${color}18`, borderColor: `${color}45`, color }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
                >
                  <span className="text-base">{emoji}</span>
                  <span>{label}</span>
                  <span className="opacity-60">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 7-Day Trend Chart ────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Timer size={13} className="text-blue-400" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">מגמה — 7 ימים</p>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="bioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip />} />
              <Area
                type="monotone" dataKey="score"
                stroke="#3b82f6" strokeWidth={2}
                fill="url(#bioGrad)"
                dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                activeDot={{ fill: "#60a5fa", r: 5, strokeWidth: 0 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Reset ──────────────────────────────────────────────────────────── */}
        <button
          onClick={resetToday}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 border border-white/6 bg-white/3 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-[0.98]"
        >
          <RefreshCw size={14} />
          איפוס נתוני היום
        </button>

        {/* ── Daily Tip ──────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={11} className="text-blue-700" />
            <p className="text-xs font-black text-blue-800 uppercase tracking-widest">טיפ יומי</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{dailyTip}</p>
        </div>

      </div>
    </main>
  );
}

// ─── Garmin Metric Card ───────────────────────────────────────────────────────

function GarminCard({
  icon, label, unit, value, color, warn, warnBadge, hint, showBar, onChange, min, max,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: number | "";
  color: string;
  warn?: boolean;
  warnBadge?: string;
  hint?: string;
  showBar?: boolean;
  onChange: (v: number | "") => void;
  min: number;
  max: number;
}) {
  const filled = value !== "" && value !== null;
  return (
    <div
      className="rounded-2xl p-3.5 border flex flex-col gap-2 transition-all duration-300"
      style={{
        background: warn ? "rgba(239,68,68,0.07)" : "rgba(15,23,42,0.98)",
        borderColor: warn ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        {warn && warnBadge && <span className="text-xs text-red-400 font-black">{warnBadge}</span>}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className="text-3xl font-black tabular-nums leading-none"
          style={{ fontFamily: "monospace", color: filled ? color : "rgba(71,85,105,0.4)" }}
        >
          {filled ? String(value) : "—"}
        </span>
        <span className="text-sm text-slate-600 font-semibold">{unit}</span>
      </div>

      <input
        type="number"
        inputMode="numeric"
        placeholder="0"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none transition-all"
        style={{
          background: warn ? "rgba(239,68,68,0.1)" : `${color}12`,
          border: `1px solid ${warn ? "rgba(239,68,68,0.3)" : `${color}30`}`,
          color,
        }}
      />

      {showBar && filled && (
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((Number(value) / max) * 100, 100)}%`,
              backgroundColor: color,
              boxShadow: `0 0 5px ${color}70`,
            }}
          />
        </div>
      )}

      {hint && <p className="text-xs text-slate-700 text-center">{hint}</p>}
    </div>
  );
}
