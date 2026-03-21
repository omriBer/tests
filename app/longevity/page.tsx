"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Heart,
  Moon,
  Flame,
  Dumbbell,
  Clock,
  TrendingUp,
  ChevronRight,
  Check,
  Plus,
  Minus,
  AlertTriangle,
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

type DayLog = {
  date: string; // YYYY-MM-DD
  fasting: boolean; // finished eating by 19:00
  hrv: number | "";
  rhr: number | "";
  sleepQuality: number; // 1-10
  zone2Minutes: number;
  strengthDone: boolean;
};

const STORAGE_KEY = "longevity_logs_v1";
const DAYS_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

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
  return {
    date,
    fasting: false,
    hrv: "",
    rhr: "",
    sleepQuality: 7,
    zone2Minutes: 0,
    strengthDone: false,
  };
}

function loadLogs(): Record<string, DayLog> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLogs(logs: Record<string, DayLog>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

// ─── Bio-Score Engine 2.0 ─────────────────────────────────────────────────────
// Nutrition 30% | Recovery (HRV) 25% | Cardio 25% | Strength 20%

function calcBioScore(logs: Record<string, DayLog>) {
  const dates = getLast7Dates();
  const week = dates.map((d) => logs[d] ?? emptyLog(d));

  const fastingDays = week.filter((d) => d.fasting).length;
  const zone2Total = week.reduce((s, d) => s + d.zone2Minutes, 0);
  const strengthSessions = week.filter((d) => d.strengthDone).length;

  // HRV-based recovery (35 ms target)
  const hrvEntries = week.filter((d) => d.hrv !== "" && Number(d.hrv) > 0);
  const avgHRV =
    hrvEntries.length > 0
      ? hrvEntries.reduce((s, d) => s + Number(d.hrv), 0) / hrvEntries.length
      : 0;
  const daysHRVMet = hrvEntries.filter((d) => Number(d.hrv) >= 35).length;

  // Sleep still logged for display only
  const sleepEntries = week.filter((d) => d.sleepQuality > 0);
  const avgSleep =
    sleepEntries.length > 0
      ? sleepEntries.reduce((s, d) => s + d.sleepQuality, 0) / sleepEntries.length
      : 0;

  const nutrition  = (fastingDays / 7)                 * 100 * 0.3;   // 30%
  const recovery   = Math.min(avgHRV / 35, 1)          * 100 * 0.25;  // 25%
  const cardio     = Math.min(zone2Total / 150, 1)     * 100 * 0.25;  // 25%
  const strength   = Math.min(strengthSessions / 2, 1) * 100 * 0.2;   // 20%

  return {
    score: Math.round(nutrition + recovery + cardio + strength),
    fastingDays,
    zone2Total,
    strengthSessions,
    avgSleep: Math.round(avgSleep * 10) / 10,
    avgHRV: Math.round(avgHRV * 10) / 10,
    daysHRVMet,
    pillars: { nutrition, recovery, cardio, strength },
  };
}

// ─── Score Circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#00E5CC" : score >= 50 ? "#FFD60A" : "#FF5252";
  const glow =
    score >= 75 ? "rgba(0,229,204,0.4)" : score >= 50 ? "rgba(255,214,10,0.35)" : "rgba(255,82,82,0.35)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} className="absolute inset-0 -rotate-90">
        <defs>
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={100} cy={100} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
        <circle
          cx={100} cy={100} r={r} fill="none" stroke={color} strokeWidth={14}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          filter="url(#scoreGlow)"
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-5xl font-black tabular-nums" style={{ color, textShadow: `0 0 20px ${glow}` }}>
          {score}
        </span>
        <span className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">Bio-Score</span>
      </div>
    </div>
  );
}

// ─── Pillar Card ──────────────────────────────────────────────────────────────

function PillarCard({
  icon, title, value, target, unit, color, score,
}: {
  icon: React.ReactNode; title: string; value: string; target: string;
  unit: string; color: string; score: number;
}) {
  const pct = Math.min(score / 100, 1);
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, border: `1px solid ${color}40` }}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <span className="text-xl font-bold text-white">{value}</span>
        <span className="text-slate-500 text-xs me-1">{unit}</span>
      </div>
      <div className="text-xs text-slate-500">יעד: {target}</div>
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color, target }: { label: string; value: string; color: string; target: string }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-600">{target}</p>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0"
      style={{
        background: checked ? "rgba(0,229,204,0.3)" : "rgba(255,255,255,0.08)",
        border: checked ? "1px solid rgba(0,229,204,0.6)" : "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center"
        style={{ left: checked ? "calc(100% - 24px)" : "4px", background: checked ? "#00E5CC" : "#475569" }}
      >
        {checked && <Check size={12} color="#000" />}
      </span>
    </button>
  );
}

// ─── Dot badge ────────────────────────────────────────────────────────────────

function Dot({ active, color, label }: { active: boolean; color: string; label: string }) {
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded-md font-medium transition-all"
      style={{
        background: active ? `${color}20` : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? `${color}50` : "rgba(255,255,255,0.06)"}`,
        color: active ? color : "#334155",
      }}
    >
      {label}
    </span>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="text-slate-400">{label}</p>
      <p className="text-teal-400 font-bold">{payload[0].value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LongevityPage() {
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [today, setToday] = useState<DayLog>(emptyLog(todayStr()));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadLogs();
    setLogs(stored);
    setToday(stored[todayStr()] ?? emptyLog(todayStr()));
    setMounted(true);
  }, []);

  const persistToday = useCallback(
    (updated: DayLog) => {
      const next = { ...logs, [updated.date]: updated };
      setLogs(next);
      saveLogs(next);
    },
    [logs]
  );

  const updateToday = useCallback(
    (patch: Partial<DayLog>) => {
      const updated = { ...today, ...patch };
      setToday(updated);
      persistToday(updated);
    },
    [today, persistToday]
  );

  const allLogs = { ...logs, [today.date]: today };
  const { score, fastingDays, zone2Total, strengthSessions, avgSleep, avgHRV, daysHRVMet, pillars } =
    calcBioScore(allLogs);

  // HRV overreach warning: HRV < 30 ms
  const todayHRV = today.hrv !== "" ? Number(today.hrv) : null;
  const showOverreachWarning = todayHRV !== null && todayHRV < 30;

  // Chart data – last 7 days (per-day contribution proxy)
  const chartData = getLast7Dates().map((date) => {
    const log = allLogs[date] ?? emptyLog(date);
    const d = new Date(date + "T12:00:00");
    const dayHRV = log.hrv !== "" ? Number(log.hrv) : 0;
    const dayScore = Math.round(
      (log.fasting ? 1 / 7 : 0) * 100 * 0.3 +
      Math.min(dayHRV / 35, 1) * 100 * 0.25 +
      Math.min(log.zone2Minutes / 150, 1) * 100 * 0.25 +
      (log.strengthDone ? 0.5 : 0) * 100 * 0.2
    );
    return { day: DAYS_HE[d.getDay()], score: dayScore };
  });

  const scoreColor = score >= 75 ? "#00E5CC" : score >= 50 ? "#FFD60A" : "#FF5252";
  const statusLabel = score >= 75 ? "מיטבי" : score >= 50 ? "בנייה" : "התחלה";

  if (!mounted) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-16 text-white bg-slate-950" dir="rtl">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(2,6,23,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* In RTL flex, first element appears on the RIGHT */}
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          <ChevronRight size={20} />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold text-white leading-tight">מטב-אופטימייזר ביולוגי</h1>
          <p className="text-xs text-slate-500">
            פרוטוקול Attia × Huberman — שבוע {Math.ceil(new Date().getDate() / 7)}
          </p>
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
          style={{ color: scoreColor, background: `${scoreColor}18`, border: `1px solid ${scoreColor}40` }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-5">

        {/* ── Overreach Warning Banner ── */}
        {showOverreachWarning && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.45)" }}
          >
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200 leading-relaxed">
              ⚠️ <strong className="text-red-300">המערכת בדריכות יתר (Overreach).</strong>{" "}
              מומלץ להימנע מאימון עז ולבצע רק פעילות שיקום (Zone 2 קל).
            </p>
          </div>
        )}

        {/* ── Score + Chart ── */}
        <section
          className="rounded-3xl p-6 flex flex-col items-center gap-4"
          style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <ScoreCircle score={score} />
          <p className="text-xs text-slate-500 text-center max-w-xs">
            ציון מורכב: תזונה (30%) · התאוששות HRV (25%) · קרדיו (25%) · כוח (20%).
          </p>
          <div className="w-full h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={scoreColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={scoreColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={2} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Pillar Cards ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            עמודי התווך השבועיים
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <PillarCard
              icon={<Flame size={16} style={{ color: "#FF6B35" }} />}
              title="תזונה"
              value={`${fastingDays}/7`}
              target="7/7 ימים עד 19:00"
              unit="ימים"
              color="#FF6B35"
              score={pillars.nutrition / 0.3}
            />
            <PillarCard
              icon={<Dumbbell size={16} style={{ color: "#A78BFA" }} />}
              title="כוח"
              value={`${strengthSessions}/2`}
              target="2 אימונים/שבוע"
              unit="אימונים"
              color="#A78BFA"
              score={pillars.strength / 0.2}
            />
            <PillarCard
              icon={<Activity size={16} style={{ color: "#00E5CC" }} />}
              title="קרדיו"
              value={`${zone2Total}/150`}
              target="150 דק׳ Zone 2"
              unit="דק׳"
              color="#00E5CC"
              score={pillars.cardio / 0.25}
            />
            <PillarCard
              icon={<Heart size={16} style={{ color: "#F472B6" }} />}
              title="התאוששות"
              value={avgHRV > 0 ? `${avgHRV}` : "—"}
              target="HRV ≥ 35ms"
              unit="ms"
              color="#F472B6"
              score={pillars.recovery / 0.25}
            />
          </div>
        </section>

        {/* ── Weekly Cumulative Stats ── */}
        <section
          className="rounded-3xl p-5"
          style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-teal-400" />
            <h2 className="text-sm font-bold text-white">סטטיסטיקה שבועית מצטברת</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="דק׳ קרדיו" value={String(zone2Total)} color="#00E5CC" target="יעד 150" />
            <StatBox label="אימוני כוח" value={String(strengthSessions)} color="#A78BFA" target="יעד 2" />
            <StatBox label="ימי 19:00" value={String(fastingDays)} color="#FF6B35" target="יעד 7" />
            <StatBox label="HRV ממוצע" value={avgHRV > 0 ? `${avgHRV}ms` : "—"} color="#F472B6" target="יעד 35ms" />
            <StatBox label="ימי HRV≥35" value={String(daysHRVMet)} color="#F472B6" target="מתוך 7" />
            <StatBox label="שינה ממוצעת" value={avgSleep > 0 ? String(avgSleep) : "—"} color="#60A5FA" target="מתוך 10" />
          </div>
        </section>

        {/* ── Daily Input ── */}
        <section
          className="rounded-3xl p-5 space-y-5"
          style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-400" />
            <h2 className="text-sm font-bold text-white">
              יומן היום —{" "}
              <span className="text-slate-400 font-normal">
                {new Date().toLocaleDateString("he-IL", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </h2>
          </div>

          {/* Fasting toggle — 19:00 Rule */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">חלון הצום</p>
              <p className="text-xs text-slate-500">
                סיימתי לאכול ב-19:00 ({fastingDays}/7 השבוע)
              </p>
            </div>
            <Toggle checked={today.fasting} onChange={() => updateToday({ fasting: !today.fasting })} />
          </div>

          <div className="h-px bg-white/5" />

          {/* Bio-metrics */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              מדדים ביולוגיים — גארמין
            </p>
            <div className="grid grid-cols-3 gap-3">
              {/* HRV */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 flex items-center gap-1">
                  <Heart size={11} className="text-rose-400" /> HRV
                </label>
                <input
                  type="number"
                  placeholder="ms"
                  min={0}
                  max={300}
                  value={today.hrv}
                  onChange={(e) =>
                    updateToday({ hrv: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 text-center tabular-nums"
                />
                {todayHRV !== null && (
                  <p
                    className={`text-xs text-center font-semibold ${
                      todayHRV >= 35 ? "text-teal-400" : todayHRV >= 30 ? "text-yellow-400" : "text-red-400"
                    }`}
                  >
                    {todayHRV >= 35 ? "✓ יעד" : todayHRV >= 30 ? "⚡ גבולי" : "⚠ נמוך"}
                  </p>
                )}
              </div>
              {/* RHR */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 flex items-center gap-1">
                  <Activity size={11} className="text-amber-400" /> RHR
                </label>
                <input
                  type="number"
                  placeholder="bpm"
                  min={30}
                  max={120}
                  value={today.rhr}
                  onChange={(e) =>
                    updateToday({ rhr: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 text-center tabular-nums"
                />
              </div>
              {/* Sleep score */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 flex items-center gap-1">
                  <Moon size={11} className="text-blue-400" /> שינה
                </label>
                <div className="relative flex items-center justify-center bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <span className="text-sm font-bold text-white tabular-nums">{today.sleepQuality}</span>
                  <span className="text-xs text-slate-500 ms-0.5">/10</span>
                </div>
              </div>
            </div>
            {/* Sleep slider — forced LTR so browser renders consistently */}
            <div className="mt-3" dir="ltr">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={today.sleepQuality}
                onChange={(e) => updateToday({ sleepQuality: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #60A5FA ${((today.sleepQuality - 1) / 9) * 100}%, rgba(255,255,255,0.08) ${((today.sleepQuality - 1) / 9) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>גרוע</span>
                <span>מיטבי</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Workout log */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              יומן אימון
            </p>

            {/* Zone 2 */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">קרדיו Zone 2</p>
                <p className="text-xs text-slate-500">
                  {today.zone2Minutes} דק׳ היום · {zone2Total} / 150 דק׳ השבוע
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateToday({ zone2Minutes: Math.max(0, today.zone2Minutes - 10) })}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-colors active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center text-sm font-bold text-white tabular-nums">
                  {today.zone2Minutes}
                </span>
                <button
                  onClick={() => updateToday({ zone2Minutes: today.zone2Minutes + 10 })}
                  className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 hover:bg-teal-500/20 transition-colors active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Strength training */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">אימון כוח</p>
                <p className="text-xs text-slate-500">{strengthSessions} / 2 אימונים השבוע</p>
              </div>
              <button
                onClick={() => updateToday({ strengthDone: !today.strengthDone })}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 flex-shrink-0"
                style={{
                  background: today.strengthDone ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)",
                  border: today.strengthDone ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color: today.strengthDone ? "#A78BFA" : "#64748B",
                }}
              >
                <Dumbbell size={14} />
                {today.strengthDone ? "בוצע ✓" : "תעד אימון"}
              </button>
            </div>
          </div>
        </section>

        {/* ── 7-Day History ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock size={12} /> יומן פעילות — 7 ימים אחרונים
          </h2>
          <div className="space-y-2">
            {getLast7Dates()
              .slice()
              .reverse()
              .map((date) => {
                const log = allLogs[date] ?? emptyLog(date);
                const isToday = date === todayStr();
                const d = new Date(date + "T12:00:00");
                const label = isToday
                  ? "היום"
                  : d.toLocaleDateString("he-IL", { weekday: "short", month: "short", day: "numeric" });
                const logHRV = log.hrv !== "" ? Number(log.hrv) : null;

                return (
                  <div
                    key={date}
                    className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: "rgba(15,23,42,0.7)",
                      border: `1px solid ${isToday ? "rgba(0,229,204,0.3)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="w-14 flex-shrink-0 text-right">
                      <p className="text-xs font-semibold" style={{ color: isToday ? "#00E5CC" : "#94A3B8" }}>
                        {label}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      <Dot active={log.fasting} color="#FF6B35" label="19:00" />
                      <Dot active={log.zone2Minutes > 0} color="#00E5CC" label={log.zone2Minutes > 0 ? `${log.zone2Minutes}ד׳` : "Z2"} />
                      <Dot active={log.strengthDone} color="#A78BFA" label="כוח" />
                      <Dot active={logHRV !== null && logHRV >= 35} color="#F472B6" label={logHRV !== null ? `${logHRV}ms` : "HRV"} />
                    </div>
                    <div className="flex-shrink-0 text-left" dir="ltr">
                      {logHRV !== null && (
                        <p className={`text-xs tabular-nums font-medium ${logHRV >= 35 ? "text-teal-400" : logHRV >= 30 ? "text-yellow-400" : "text-red-400"}`}>
                          HRV {logHRV}
                        </p>
                      )}
                      {log.rhr !== "" && (
                        <p className="text-xs text-amber-400 tabular-nums">{log.rhr} bpm</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-slate-700 pb-4">
          פרוטוקול: Attia Outlive × Huberman Lab — עקוב. מטב. חיה יותר.
        </p>
      </div>
    </main>
  );
}
