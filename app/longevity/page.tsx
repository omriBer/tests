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
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

const BIOHACK_TIPS = [
  "💡 10 דקות אור שמש תוך שעה מהקימה מסדרות את הקצב הצירקדיאני.",
  "🚿 90 שניות מים קרים בסיום מקלחת מעלות HRV ומגבירות נוראדרנלין.",
  "🧘 נשימת קופסה 4-4-4-4 לפני שינה — מורידה קורטיזול.",
  "🥩 30g חלבון תוך 30 דקות מסיום אימון כוח — קריטי לסינתזת שריר.",
  "🚶 הליכה קלה 10 דקות אחרי ארוחה — מפחיתה גלוקוז בדם ב-25%.",
  "🌡️ הורד חדר שינה ל-18°C — גוף צונן נכנס לשינה עמוקה מהר יותר.",
  "🧊 אמבטיית קרח 15 דקות אחרי כוח — מכפילה דופמין ל-3 שעות.",
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

// ─── Score Engine ─────────────────────────────────────────────────────────────
// Returns individual point contributions so UI can show them live.
//
//  תזונה   30 pts  — today's 19:00 fasting
//  HRV     25 pts  — >35 full | 30-35 linear partial | <30 zero + warning
//  Zone 2  25 pts  — weekly progress toward 150 min
//  כוח     20 pts  — 10 pts per session, max 2/week

function calcPoints(today: DayLog, allLogs: Record<string, DayLog>) {
  // Nutrition
  const nutritionPts = today.fasting ? 30 : 0;

  // HRV
  const hrv = today.hrv !== "" ? Number(today.hrv) : null;
  let hrvPts = 0;
  let hrvPartial = false;
  let hrvWarning = false;
  if (hrv !== null) {
    if (hrv >= 35)       { hrvPts = 25; }
    else if (hrv >= 30)  { hrvPts = Math.round(((hrv - 30) / 5) * 25); hrvPartial = true; }
    else                 { hrvPts = 0; hrvWarning = true; }
  }

  // Zone 2 — weekly total including today
  const zone2Total = getLast7Dates().reduce((s, d) => s + (allLogs[d]?.zone2Minutes ?? 0), 0);
  const zone2Pct   = Math.min(zone2Total / 150, 1);
  const zone2Pts   = Math.round(zone2Pct * 25);

  // Strength — weekly sessions including today
  const strengthSessions = getLast7Dates().filter((d) => allLogs[d]?.strengthDone).length;
  const strengthPts = Math.min(strengthSessions, 2) * 10;

  const total = nutritionPts + hrvPts + zone2Pts + strengthPts;

  return {
    total,
    nutritionPts,
    hrvPts, hrvPartial, hrvWarning,
    zone2Pts, zone2Total, zone2Pct,
    strengthPts, strengthSessions,
  };
}

// ─── Status config ────────────────────────────────────────────────────────────

function getStatus(score: number) {
  if (score >= 85) return {
    label: "ביצועים אופטימליים. גיל ביולוגי בנסיגה.",
    color: "#10b981",
    glow:  "rgba(16,185,129,0.45)",
    bg:    "rgba(16,185,129,0.08)",
    border:"rgba(16,185,129,0.25)",
  };
  if (score >= 60) return {
    label: "מצב תחזוקה. יש מקום לשיפור בשיקום.",
    color: "#f59e0b",
    glow:  "rgba(245,158,11,0.4)",
    bg:    "rgba(245,158,11,0.07)",
    border:"rgba(245,158,11,0.22)",
  };
  return {
    label: "אזהרת שחיקה. תעדוף שינה ומנוחה מיידית.",
    color: "#ef4444",
    glow:  "rgba(239,68,68,0.45)",
    bg:    "rgba(239,68,68,0.07)",
    border:"rgba(239,68,68,0.25)",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated points badge shown next to each input */
function PtsBadge({ pts, max, partial }: { pts: number; max: number; partial?: boolean }) {
  const full    = pts === max;
  const empty   = pts === 0;
  const color   = full ? "#10b981" : partial ? "#f59e0b" : empty ? "#334155" : "#f59e0b";
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 tabular-nums min-w-[52px] transition-all duration-300 border"
      style={{
        background: full ? "rgba(16,185,129,0.12)" : empty ? "rgba(255,255,255,0.03)" : "rgba(245,158,11,0.1)",
        borderColor: full ? "rgba(16,185,129,0.3)" : empty ? "rgba(255,255,255,0.06)" : "rgba(245,158,11,0.25)",
      }}
    >
      <span className="text-base font-black leading-none" style={{ color }}>
        +{pts}
      </span>
      <span className="text-xs text-slate-700 leading-none mt-0.5">/ {max}</span>
    </div>
  );
}

/** Section header row */
function SectionHeader({
  icon, label, pts, max, partial,
}: {
  icon: React.ReactNode; label: string; pts: number; max: number; partial?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-black text-white tracking-wide">{label}</span>
      </div>
      <PtsBadge pts={pts} max={max} partial={partial} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LongevityPage() {
  const [logs, setLogs]       = useState<Record<string, DayLog>>({});
  const [today, setToday]     = useState<DayLog>(emptyLog(todayStr()));
  const [mounted, setMounted] = useState(false);
  const [flash, setFlash]     = useState(false); // score flash on change

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
    // Flash the score briefly on every change
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
  }, [today, persistToday]);

  const resetToday = useCallback(() => {
    const fresh = emptyLog(todayStr());
    setToday(fresh);
    const next = { ...logs, [fresh.date]: fresh };
    setLogs(next);
    saveLogs(next);
  }, [logs]);

  // Always include today in allLogs for zone2 / strength weekly sums
  const allLogs = { ...logs, [today.date]: today };

  const { total, nutritionPts, hrvPts, hrvPartial, hrvWarning, zone2Pts, zone2Total, zone2Pct, strengthPts, strengthSessions } =
    calcPoints(today, allLogs);

  const status  = getStatus(total);
  const todayHRV = today.hrv !== "" ? Number(today.hrv) : null;
  const sleepColor = today.sleepQuality >= 8 ? "#10b981" : today.sleepQuality >= 6 ? "#f59e0b" : "#ef4444";

  const dailyTip = BIOHACK_TIPS[new Date().getDay()];

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
        style={{
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-slate-500 uppercase">Bio-Calculator</p>
          <p className="text-xs text-slate-700 mt-0.5">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link
          href="/"
          className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-3 max-w-lg mx-auto">

        {/* ── Digital Score Display ────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 transition-all duration-300"
          style={{ background: status.bg, border: `1px solid ${status.border}` }}
        >
          {/* Score number — digital lab-monitor style */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.2em] mb-3">
                ציון יומי
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-black tabular-nums leading-none transition-all duration-200"
                  style={{
                    fontSize: "clamp(72px, 20vw, 96px)",
                    fontVariantNumeric: "tabular-nums",
                    color: status.color,
                    textShadow: flash
                      ? `0 0 60px ${status.glow}, 0 0 20px ${status.color}`
                      : `0 0 30px ${status.glow}`,
                    letterSpacing: "-0.03em",
                    fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                  }}
                >
                  {String(total).padStart(2, "0")}
                </span>
                <span className="text-2xl text-slate-700 font-light mb-2">/100</span>
              </div>
            </div>

            {/* Point breakdown pills — right side */}
            <div className="flex flex-col gap-1.5 pb-1">
              {[
                { label: "תזונה",  pts: nutritionPts, max: 30, color: "#f97316" },
                { label: "HRV",    pts: hrvPts,       max: 25, color: "#ec4899" },
                { label: "קרדיו", pts: zone2Pts,     max: 25, color: "#10b981" },
                { label: "כוח",   pts: strengthPts,  max: 20, color: "#8b5cf6" },
              ].map(({ label, pts, max, color }) => (
                <div key={label} className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-slate-600">{label}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-sm font-black tabular-nums transition-all duration-200"
                      style={{ color: pts === max ? color : pts > 0 ? "#f59e0b" : "#1e293b" }}
                    >
                      {pts}
                    </span>
                    <span className="text-xs text-slate-800">/{max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segmented progress bar */}
          <div className="flex gap-1 mb-3">
            {[
              { pts: nutritionPts, max: 30, color: "#f97316" },
              { pts: hrvPts,       max: 25, color: "#ec4899" },
              { pts: zone2Pts,     max: 25, color: "#10b981" },
              { pts: strengthPts,  max: 20, color: "#8b5cf6" },
            ].map(({ pts, max, color }, i) => (
              <div
                key={i}
                className="rounded-full overflow-hidden"
                style={{ flex: max, height: 6, background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(pts / max) * 100}%`,
                    backgroundColor: color,
                    boxShadow: pts > 0 ? `0 0 8px ${color}80` : "none",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Status message */}
          <p
            className="text-sm font-bold leading-snug transition-all duration-300"
            style={{ color: status.color }}
          >
            {status.label}
          </p>
        </div>

        {/* ── Overreach Banner ────────────────────────────────────────────── */}
        {hrvWarning && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-black text-red-300">דריכות יתר — HRV קריטי</p>
              <p className="text-xs text-red-500 mt-0.5">היום מנוחה בלבד. אפס אימון עצים.</p>
            </div>
            <span
              className="mr-auto text-2xl font-black tabular-nums"
              style={{ color: "#ef4444", fontFamily: "monospace" }}
            >
              {todayHRV}ms
            </span>
          </div>
        )}

        {/* ── TILE: תזונה ─────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <SectionHeader
            icon={<Flame size={14} className="text-orange-500" />}
            label="תזונה — סגירת מטבח"
            pts={nutritionPts}
            max={30}
          />

          <button
            onClick={() => updateToday({ fasting: !today.fasting })}
            className="mt-3 w-full rounded-2xl py-4 flex items-center justify-between px-4 transition-all duration-200 active:scale-[0.98] border"
            style={
              today.fasting
                ? { background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.4)" }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }
            }
          >
            <span
              className="text-base font-bold transition-colors"
              style={{ color: today.fasting ? "#10b981" : "#475569" }}
            >
              סגרתי מטבח ב-19:00
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={
                today.fasting
                  ? { background: "#10b981", boxShadow: "0 0 16px rgba(16,185,129,0.5)" }
                  : { background: "rgba(255,255,255,0.07)" }
              }
            >
              {today.fasting
                ? <Check size={16} color="#000" strokeWidth={3} />
                : <X size={14} className="text-slate-600" />}
            </div>
          </button>
        </div>

        {/* ── TILE: HRV ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <SectionHeader
            icon={<Heart size={14} className="text-pink-500" />}
            label="שיקום — HRV גארמין"
            pts={hrvPts}
            max={25}
            partial={hrvPartial}
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            {/* HRV input */}
            <div>
              <p className="text-xs text-slate-600 mb-1.5">HRV (ms) — יעד ≥ 35</p>
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
                className="w-full rounded-xl px-3 py-3 text-center text-2xl font-black tabular-nums focus:outline-none transition-all duration-200"
                style={{
                  fontFamily: "monospace",
                  background: hrvWarning
                    ? "rgba(239,68,68,0.12)"
                    : hrvPartial
                    ? "rgba(245,158,11,0.1)"
                    : todayHRV !== null && todayHRV >= 35
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${
                    hrvWarning ? "rgba(239,68,68,0.4)"
                    : hrvPartial ? "rgba(245,158,11,0.35)"
                    : todayHRV !== null && todayHRV >= 35 ? "rgba(16,185,129,0.35)"
                    : "rgba(255,255,255,0.08)"
                  }`,
                  color: hrvWarning ? "#ef4444" : hrvPartial ? "#f59e0b" : todayHRV !== null && todayHRV >= 35 ? "#10b981" : "#94a3b8",
                }}
              />
              {todayHRV !== null && (
                <p
                  className="text-xs text-center mt-1.5 font-semibold"
                  style={{ color: hrvWarning ? "#ef4444" : hrvPartial ? "#f59e0b" : "#10b981" }}
                >
                  {hrvWarning ? `⚠ 0 נק׳ — מנוחה` : hrvPartial ? `⚡ ${hrvPts} נק׳ — חלקי` : `✓ 25 נק׳ — מלא`}
                </p>
              )}
            </div>

            {/* RHR input */}
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
                className="w-full rounded-xl px-3 py-3 text-center text-2xl font-black text-slate-400 tabular-nums focus:outline-none bg-white/5 border border-white/8"
                style={{ fontFamily: "monospace" }}
              />
              {today.rhr !== "" && (
                <p className="text-xs text-center mt-1.5 text-slate-600">
                  {Number(today.rhr) <= 55 ? "✓ מצוין" : Number(today.rhr) <= 65 ? "טוב" : "גבוה"}
                </p>
              )}
            </div>
          </div>

          {/* HRV progress bar */}
          {todayHRV !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-700 mb-1">
                <span>0ms</span><span>35ms (יעד)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(todayHRV / 40, 1) * 100}%`,
                    backgroundColor: hrvWarning ? "#ef4444" : hrvPartial ? "#f59e0b" : "#10b981",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── TILE: Zone 2 ────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <SectionHeader
            icon={<Activity size={14} className="text-emerald-500" />}
            label="קרדיו Zone 2"
            pts={zone2Pts}
            max={25}
          />

          {/* Weekly progress bar */}
          <div className="mt-3 mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-600">שבועי: {zone2Total} / 150 דק׳</span>
              <span className="font-bold" style={{ color: zone2Pct >= 1 ? "#10b981" : "#64748b" }}>
                {Math.round(zone2Pct * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${zone2Pct * 100}%`,
                  backgroundColor: zone2Pct >= 1 ? "#10b981" : zone2Pct >= 0.6 ? "#f59e0b" : "#3b82f6",
                  boxShadow: zone2Pct > 0 ? `0 0 10px rgba(59,130,246,0.4)` : "none",
                }}
              />
            </div>
          </div>

          {/* Today's minutes stepper */}
          <p className="text-xs text-slate-600 mb-2">
            היום: {today.zone2Minutes} דק׳
            {150 - zone2Total > 0 && ` · נותרו ${150 - zone2Total} דק׳ לסגירת יעד`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateToday({ zone2Minutes: Math.max(0, today.zone2Minutes - 15) })}
              className="flex-1 py-3.5 rounded-2xl text-xl font-black text-slate-500 border border-white/8 bg-white/4 active:scale-95 transition-all"
            >
              −
            </button>
            <span
              className="w-20 text-center text-4xl font-black tabular-nums text-emerald-400"
              style={{ fontFamily: "monospace" }}
            >
              {today.zone2Minutes}
            </span>
            <button
              onClick={() => updateToday({ zone2Minutes: today.zone2Minutes + 15 })}
              className="flex-1 py-3.5 rounded-2xl text-xl font-black text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 active:scale-95 transition-all"
              style={{ boxShadow: "0 0 14px rgba(16,185,129,0.15)" }}
            >
              +
            </button>
          </div>
          <div className="flex gap-2 mt-2.5">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => updateToday({ zone2Minutes: m })}
                className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                style={
                  today.zone2Minutes === m
                    ? { background: "rgba(16,185,129,0.18)", borderColor: "rgba(16,185,129,0.45)", color: "#10b981" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#475569" }
                }
              >
                {m}′
              </button>
            ))}
          </div>
        </div>

        {/* ── TILE: כוח ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <SectionHeader
            icon={<Dumbbell size={14} className="text-violet-500" />}
            label="אימון כוח"
            pts={strengthPts}
            max={20}
          />

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">
                {strengthSessions} / 2 אימונים השבוע · 10 נק׳ לאימון
              </p>
              {/* Visual session dots */}
              <div className="flex gap-2 mt-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border-2 transition-all duration-300"
                    style={{
                      background: i < strengthSessions ? "#8b5cf6" : "transparent",
                      borderColor: i < strengthSessions ? "#8b5cf6" : "rgba(139,92,246,0.25)",
                      boxShadow: i < strengthSessions ? "0 0 8px rgba(139,92,246,0.5)" : "none",
                    }}
                  />
                ))}
                <span className="text-xs text-slate-700 mr-1 self-center">= {strengthPts} נק׳</span>
              </div>
            </div>

            <button
              onClick={() => updateToday({ strengthDone: !today.strengthDone })}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border"
              style={
                today.strengthDone
                  ? { background: "rgba(139,92,246,0.18)", borderColor: "rgba(139,92,246,0.45)", color: "#a78bfa" }
                  : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#475569" }
              }
            >
              {today.strengthDone ? <Check size={15} /> : <Dumbbell size={15} />}
              {today.strengthDone ? "בוצע היום" : "תעד אימון"}
            </button>
          </div>
        </div>

        {/* ── TILE: שינה (display only) ────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Moon size={14} className="text-blue-400" />
              <span className="text-sm font-black text-white tracking-wide">שינה</span>
              <span className="text-xs text-slate-700">(לא בציון)</span>
            </div>
            <span className="text-2xl font-black tabular-nums" style={{ color: sleepColor, fontFamily: "monospace" }}>
              {today.sleepQuality}
            </span>
          </div>
          <div dir="ltr">
            <input
              type="range"
              min={1} max={10} step={1}
              value={today.sleepQuality}
              onChange={(e) => updateToday({ sleepQuality: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${sleepColor} ${((today.sleepQuality - 1) / 9) * 100}%, rgba(255,255,255,0.05) ${((today.sleepQuality - 1) / 9) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-slate-700 mt-1.5">
              <span>גרועה</span><span>מיטבית</span>
            </div>
          </div>
        </div>

        {/* ── Reset + Tip ──────────────────────────────────────────────────── */}
        <button
          onClick={resetToday}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 border border-white/6 bg-white/3 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-[0.98]"
        >
          <RefreshCw size={15} />
          איפוס נתוני היום לאימון מחר
        </button>

        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={11} className="text-emerald-700" />
            <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">טיפ יומי</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{dailyTip}</p>
        </div>

      </div>
    </main>
  );
}
