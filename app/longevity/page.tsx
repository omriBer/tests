"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Heart,
  Moon,
  Flame,
  Dumbbell,
  ChevronRight,
  Check,
  X,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = "rest" | "zone2" | "strength";

type DayLog = {
  date: string;
  fasting: boolean;
  hrv: number | "";
  rhr: number | "";
  sleepQuality: number;
  zone2Minutes: number;
  strengthDone: boolean;
};

const STORAGE_KEY = "longevity_logs_v1";
const DAYS_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const BIOHACK_TIPS = [
  "💡 10 דקות אור שמש בעיניים תוך שעה מהקימה — מסדרות את הקצב הצירקדיאני ומשפרות שינה.",
  "🚿 90 שניות מים קרים בסיום מקלחת: מעלות HRV ומגבירות נוראדרנלין ב-300%.",
  "🧘 נשימת קופסה 4-4-4-4 לפני שינה — מורידה קורטיזול ומאיצה כניסה לשינה עמוקה.",
  "🥩 30g חלבון תוך 30 דקות מסיום אימון כוח — קריטי לסינתזת שריר מיטבית.",
  "🚶 הליכה קלה 10 דקות אחרי ארוחה — מפחיתה גלוקוז בדם ב-22–30%.",
  "🌡️ הורד טמפרטורת חדר השינה ל-18°C — גוף צונן נכנס לשינה עמוקה מהר יותר.",
  "🧊 15 דקות אמבטיית קרח (11–15°C) אחרי אימון כוח מכפילות דופמין ל-3 שעות.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return { date, fasting: false, hrv: "", rhr: "", sleepQuality: 7, zone2Minutes: 0, strengthDone: false };
}

function loadLogs(): Record<string, DayLog> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveLogs(logs: Record<string, DayLog>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

// ─── Bio-Score 2.0 ────────────────────────────────────────────────────────────
// Nutrition 30% | HRV Recovery 25% | Cardio 25% | Strength 20%

function calcBioScore(logs: Record<string, DayLog>) {
  const week = getLast7Dates().map((d) => logs[d] ?? emptyLog(d));

  const fastingDays      = week.filter((d) => d.fasting).length;
  const zone2Total       = week.reduce((s, d) => s + d.zone2Minutes, 0);
  const strengthSessions = week.filter((d) => d.strengthDone).length;

  const hrvEntries = week.filter((d) => d.hrv !== "" && Number(d.hrv) > 0);
  const avgHRV =
    hrvEntries.length > 0
      ? hrvEntries.reduce((s, d) => s + Number(d.hrv), 0) / hrvEntries.length
      : 0;

  const nutrition = (fastingDays / 7)                  * 100 * 0.3;
  const recovery  = Math.min(avgHRV / 35, 1)           * 100 * 0.25;
  const cardio    = Math.min(zone2Total / 150, 1)      * 100 * 0.25;
  const strength  = Math.min(strengthSessions / 2, 1)  * 100 * 0.2;

  return {
    score: Math.round(nutrition + recovery + cardio + strength),
    fastingDays, zone2Total, strengthSessions,
    avgHRV: Math.round(avgHRV * 10) / 10,
    pillars: { nutrition, recovery, cardio, strength },
  };
}

function dayScore(log: DayLog): number {
  const hrv = log.hrv !== "" ? Number(log.hrv) : 0;
  return Math.round(
    (log.fasting ? 1 / 7 : 0)          * 100 * 0.3 +
    Math.min(hrv / 35, 1)              * 100 * 0.25 +
    Math.min(log.zone2Minutes / 150, 1) * 100 * 0.25 +
    (log.strengthDone ? 0.5 : 0)       * 100 * 0.2
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ done, pending = "ממתין לעדכון" }: { done: boolean; pending?: string }) {
  return (
    <span
      className={`inline-flex text-xs font-bold px-2 py-0.5 rounded-full border ${
        done
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-slate-800/80 text-slate-500 border-slate-700"
      }`}
    >
      {done ? "בוצע ✓" : pending}
    </span>
  );
}

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-600 w-10 text-left shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 1) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums w-7 text-left shrink-0" style={{ color }}>
        {Math.round(Math.min(pct, 1) * 100)}%
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LongevityPage() {
  const [logs, setLogs]     = useState<Record<string, DayLog>>({});
  const [today, setToday]   = useState<DayLog>(emptyLog(todayStr()));
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

  const allLogs = { ...logs, [today.date]: today };
  const { score, fastingDays, zone2Total, strengthSessions, avgHRV, pillars } = calcBioScore(allLogs);

  // Derived state
  const todayHRV        = today.hrv !== "" ? Number(today.hrv) : null;
  const showOverreach   = todayHRV !== null && todayHRV < 30;
  const hrvColor        = todayHRV === null ? "#64748b" : todayHRV >= 35 ? "#10b981" : todayHRV >= 30 ? "#f59e0b" : "#ef4444";

  const activityType: ActivityType =
    today.strengthDone ? "strength" : today.zone2Minutes > 0 ? "zone2" : "rest";

  const setActivity = (type: ActivityType) => {
    if (type === "rest")     updateToday({ strengthDone: false, zone2Minutes: 0 });
    if (type === "zone2")    updateToday({ strengthDone: false });
    if (type === "strength") updateToday({ strengthDone: true, zone2Minutes: 0 });
  };

  const scoreColor  = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const statusLabel = score >= 75 ? "מצב מיטבי" : score >= 50 ? "בבנייה" : "התחלה";

  const dailyTip  = BIOHACK_TIPS[new Date().getDay()];

  const chartData = getLast7Dates().map((date) => ({
    day:     DAYS_HE[new Date(date + "T12:00:00").getDay()],
    score:   dayScore(allLogs[date] ?? emptyLog(date)),
    isToday: date === todayStr(),
  }));

  const sleepColor = today.sleepQuality >= 8 ? "#10b981" : today.sleepQuality >= 6 ? "#f59e0b" : "#ef4444";

  if (!mounted) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-black">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-black text-white" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">Bio-Optimizer</p>
          <p className="text-xs text-slate-700 mt-0.5">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/" className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-3 max-w-lg mx-auto">

        {/* ── Bio-Score Hero ──────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Score + pillar breakdown */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">Bio-Score שבועי</p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-7xl font-black tabular-nums leading-none"
                  style={{ color: scoreColor, textShadow: `0 0 40px ${scoreColor}40` }}
                >
                  {score}
                </span>
                <span className="text-xl text-slate-600 font-light">/100</span>
              </div>
              <p className="text-sm font-bold mt-1.5" style={{ color: scoreColor }}>{statusLabel}</p>
            </div>

            <div className="flex flex-col gap-2 pt-1 min-w-[110px]">
              <MiniBar label="תזונה"    pct={pillars.nutrition / 0.3}  color="#f97316" />
              <MiniBar label="HRV"      pct={pillars.recovery  / 0.25} color="#ec4899" />
              <MiniBar label="קרדיו"   pct={pillars.cardio    / 0.25} color="#10b981" />
              <MiniBar label="כוח"     pct={pillars.strength  / 0.2}  color="#8b5cf6" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${score}%`, backgroundColor: scoreColor, boxShadow: `0 0 12px ${scoreColor}60` }}
            />
          </div>

          {/* 7-day bar sparkline */}
          <div className="h-14">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={20} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="25%">
                <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.isToday
                          ? scoreColor
                          : entry.score >= 65
                          ? "rgba(16,185,129,0.25)"
                          : "rgba(255,255,255,0.05)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Overreach Banner ────────────────────────────────────────────── */}
        {showOverreach && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <span className="text-base">⚠️</span>
            <p className="text-sm font-semibold text-red-300">
              דריכות יתר: היום <span className="text-red-400 font-black">מנוחה בלבד.</span>
            </p>
          </div>
        )}

        {/* ── Row: Nutrition + Recovery ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* TILE: תזונה */}
          <div
            className="rounded-2xl p-4 flex flex-col"
            style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Flame size={12} className="text-orange-500" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">תזונה</span>
              <span className="text-xs text-slate-700 mr-auto">30%</span>
            </div>

            {/* Big tap target */}
            <button
              onClick={() => updateToday({ fasting: !today.fasting })}
              className="flex-1 min-h-[80px] rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 border"
              style={
                today.fasting
                  ? { background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.4)" }
                  : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }
              }
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={
                  today.fasting
                    ? { background: "#10b981", boxShadow: "0 0 16px rgba(16,185,129,0.5)" }
                    : { background: "rgba(255,255,255,0.07)" }
                }
              >
                {today.fasting
                  ? <Check size={18} color="#000" strokeWidth={3} />
                  : <X size={16} className="text-slate-600" />
                }
              </div>
              <p className="text-xs text-center leading-snug px-1" style={{ color: today.fasting ? "#10b981" : "#475569" }}>
                סגרתי מטבח<br />ב-19:00
              </p>
            </button>

            <div className="flex items-center justify-between mt-2.5">
              <StatusBadge done={today.fasting} />
              <span className="text-xs text-slate-600 tabular-nums">{fastingDays}/7</span>
            </div>
          </div>

          {/* TILE: התאוששות */}
          <div
            className="rounded-2xl p-4 flex flex-col"
            style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Heart size={12} className="text-pink-500" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">HRV</span>
              <span className="text-xs text-slate-700 mr-auto">25%</span>
            </div>

            <div className="space-y-2 flex-1">
              <div>
                <p className="text-xs text-slate-600 mb-1.5">HRV (ms)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  min={0}
                  max={300}
                  value={today.hrv}
                  onChange={(e) =>
                    updateToday({ hrv: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  className="w-full rounded-xl px-2 py-2.5 text-center text-xl font-black tabular-nums focus:outline-none transition-colors"
                  style={{
                    background: showOverreach
                      ? "rgba(239,68,68,0.12)"
                      : todayHRV !== null && todayHRV >= 35
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${showOverreach ? "rgba(239,68,68,0.4)" : todayHRV !== null && todayHRV >= 35 ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)"}`,
                    color: hrvColor,
                  }}
                />
                {todayHRV !== null && (
                  <p className="text-xs text-center mt-1 font-semibold" style={{ color: hrvColor }}>
                    {todayHRV >= 35 ? "✓ יעד הושג" : todayHRV >= 30 ? "⚡ גבולי" : "⚠ נמוך"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1.5">RHR (bpm)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  min={30}
                  max={120}
                  value={today.rhr}
                  onChange={(e) =>
                    updateToday({ rhr: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2 py-2.5 text-center text-lg font-bold text-slate-300 tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-2.5">
              <StatusBadge done={today.hrv !== ""} />
            </div>
          </div>
        </div>

        {/* ── TILE: פעילות ────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-1.5 mb-4">
            <Activity size={12} className="text-emerald-500" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">פעילות</span>
            <span className="text-xs text-slate-700 mr-auto">קרדיו 25% · כוח 20%</span>
            <StatusBadge done={today.zone2Minutes > 0 || today.strengthDone} />
          </div>

          {/* Activity radio buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(
              [
                { type: "rest"     as ActivityType, label: "מנוחה",    icon: <Moon size={15} />,     color: "#64748b" },
                { type: "zone2"    as ActivityType, label: "Zone 2",   icon: <Activity size={15} />,  color: "#10b981" },
                { type: "strength" as ActivityType, label: "כוח",     icon: <Dumbbell size={15} />,  color: "#8b5cf6" },
              ] as const
            ).map(({ type, label, icon, color }) => {
              const active = activityType === type;
              return (
                <button
                  key={type}
                  onClick={() => setActivity(type)}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all duration-200 active:scale-95"
                  style={
                    active
                      ? { background: `${color}18`, borderColor: `${color}45`, color }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", color: "#334155" }
                  }
                >
                  {icon}
                  <span className="text-xs font-bold">{label}</span>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Zone 2 minutes — only when zone2 is selected */}
          {activityType === "zone2" && (
            <div
              className="rounded-xl p-3 space-y-3"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">דקות אירובי</p>
                <p className="text-xs text-slate-600 tabular-nums">{zone2Total} / 150 השבוע</p>
              </div>

              {/* +/- stepper */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateToday({ zone2Minutes: Math.max(0, today.zone2Minutes - 15) })}
                  className="flex-1 py-3 rounded-xl text-xl font-black text-slate-400 border border-white/8 bg-white/5 active:scale-95 transition-all"
                >
                  −
                </button>
                <span className="w-20 text-center text-3xl font-black text-emerald-400 tabular-nums">
                  {today.zone2Minutes}
                </span>
                <button
                  onClick={() => updateToday({ zone2Minutes: today.zone2Minutes + 15 })}
                  className="flex-1 py-3 rounded-xl text-xl font-black text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 active:scale-95 transition-all"
                  style={{ boxShadow: "0 0 16px rgba(16,185,129,0.15)" }}
                >
                  +
                </button>
              </div>

              {/* Quick-set chips */}
              <div className="flex gap-2">
                {[30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => updateToday({ zone2Minutes: m })}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border"
                    style={
                      today.zone2Minutes === m
                        ? { background: "rgba(16,185,129,0.2)", borderColor: "rgba(16,185,129,0.5)", color: "#10b981" }
                        : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#475569" }
                    }
                  >
                    {m}′
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Strength confirmation */}
          {activityType === "strength" && (
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Check size={16} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-violet-300">אימון כוח נרשם</p>
                <p className="text-xs text-slate-500">{strengthSessions} / 2 אימונים השבוע</p>
              </div>
            </div>
          )}
        </div>

        {/* ── TILE: שינה ─────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-1.5 mb-4">
            <Moon size={12} className="text-blue-400" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">שינה</span>
            <div className="mr-auto flex items-center gap-2">
              <span className="text-2xl font-black tabular-nums" style={{ color: sleepColor }}>
                {today.sleepQuality}
              </span>
              <span className="text-xs text-slate-600">/10</span>
            </div>
          </div>

          {/* Slider wrapper forced LTR for consistent rendering */}
          <div dir="ltr">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={today.sleepQuality}
              onChange={(e) => updateToday({ sleepQuality: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${sleepColor} ${((today.sleepQuality - 1) / 9) * 100}%, rgba(255,255,255,0.05) ${((today.sleepQuality - 1) / 9) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-slate-700 mt-2">
              <span>גרועה (1)</span>
              <span>מיטבית (10)</span>
            </div>
          </div>

          {/* Quick-set chips */}
          <div className="flex gap-2 mt-3">
            {[5, 6, 7, 8, 9, 10].map((v) => (
              <button
                key={v}
                onClick={() => updateToday({ sleepQuality: v })}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border"
                style={
                  today.sleepQuality === v
                    ? { background: `${sleepColor}25`, borderColor: `${sleepColor}50`, color: sleepColor }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#475569" }
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ── Daily Bio-Hack Tip ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-emerald-600" />
            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">טיפ ביו-האקינג יומי</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{dailyTip}</p>
        </div>

      </div>
    </main>
  );
}
