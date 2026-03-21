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
  ChevronLeft,
  Check,
  Plus,
  Minus,
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
  fasting: boolean;
  hrv: number | "";
  rhr: number | "";
  sleepQuality: number; // 1-10
  zone2Minutes: number;
  strengthDone: boolean;
};

const STORAGE_KEY = "longevity_logs_v1";
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

// ─── Bio-Score Engine ─────────────────────────────────────────────────────────

function calcBioScore(logs: Record<string, DayLog>) {
  const dates = getLast7Dates();
  const week = dates.map((d) => logs[d] ?? emptyLog(d));

  const fastingDays = week.filter((d) => d.fasting).length;
  const zone2Total = week.reduce((s, d) => s + d.zone2Minutes, 0);
  const strengthSessions = week.filter((d) => d.strengthDone).length;
  const sleepEntries = week.filter((d) => d.sleepQuality > 0);
  const avgSleep =
    sleepEntries.length > 0
      ? sleepEntries.reduce((s, d) => s + d.sleepQuality, 0) /
        sleepEntries.length
      : 0;

  const metabolic = (fastingDays / 7) * 100 * 0.3;
  const endurance = Math.min(zone2Total / 150, 1) * 100 * 0.25;
  const strength = Math.min(strengthSessions / 2, 1) * 100 * 0.25;
  const recovery = (avgSleep / 10) * 100 * 0.2;

  return {
    score: Math.round(metabolic + endurance + strength + recovery),
    fastingDays,
    zone2Total,
    strengthSessions,
    avgSleep: Math.round(avgSleep * 10) / 10,
    pillars: { metabolic, endurance, strength, recovery },
  };
}

// ─── Score Circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 75 ? "#00E5CC" : score >= 50 ? "#FFD60A" : "#FF5252";
  const glow =
    score >= 75
      ? "rgba(0,229,204,0.4)"
      : score >= 50
      ? "rgba(255,214,10,0.35)"
      : "rgba(255,82,82,0.35)";

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
        {/* Track */}
        <circle
          cx={100}
          cy={100}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={14}
        />
        {/* Progress */}
        <circle
          cx={100}
          cy={100}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          filter="url(#scoreGlow)"
          style={{
            transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease",
          }}
        />
      </svg>
      {/* Center text */}
      <div className="flex flex-col items-center z-10">
        <span
          className="text-5xl font-black tabular-nums"
          style={{ color, textShadow: `0 0 20px ${glow}` }}
        >
          {score}
        </span>
        <span className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">
          Bio-Score
        </span>
      </div>
    </div>
  );
}

// ─── Pillar Card ──────────────────────────────────────────────────────────────

function PillarCard({
  icon,
  title,
  value,
  target,
  unit,
  color,
  score,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  target: string;
  unit: string;
  color: string;
  score: number;
}) {
  const pct = Math.min(score / 100, 1);
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}1A`, border: `1px solid ${color}40` }}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div>
        <span className="text-xl font-bold text-white">{value}</span>
        <span className="text-slate-500 text-xs ml-1">{unit}</span>
      </div>
      <div className="text-xs text-slate-500">Target: {target}</div>
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
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

  // Load from localStorage
  useEffect(() => {
    const stored = loadLogs();
    setLogs(stored);
    setToday(stored[todayStr()] ?? emptyLog(todayStr()));
    setMounted(true);
  }, []);

  // Persist today's log
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
  const { score, fastingDays, zone2Total, strengthSessions, avgSleep, pillars } =
    calcBioScore(allLogs);

  // Chart data – last 7 days
  const chartData = getLast7Dates().map((date, i) => {
    const dayLogs = { ...allLogs };
    // compute score up to this day (just show daily contribution as proxy)
    const dayLog = dayLogs[date] ?? emptyLog(date);
    const dayScore = Math.round(
      ((dayLog.fasting ? 1 / 7 : 0) * 100 * 0.3 +
        (dayLog.strengthDone ? 0.5 : 0) * 100 * 0.25 +
        (Math.min(dayLog.zone2Minutes / 150, 1)) * 100 * 0.25 +
        (dayLog.sleepQuality / 10) * 100 * 0.2)
    );
    const d = new Date(date);
    return { day: DAYS_OF_WEEK[d.getDay()], score: dayScore };
  });

  const scoreColor =
    score >= 75 ? "#00E5CC" : score >= 50 ? "#FFD60A" : "#FF5252";

  if (!mounted) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-16 text-white" dir="ltr">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 px-5 py-4 flex items-center gap-3"
        style={{
          background: "rgba(13,17,23,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">
            Longevity Bio-Optimizer
          </h1>
          <p className="text-xs text-slate-500">
            Attia × Huberman Protocol — Week{" "}
            {Math.ceil((new Date().getDate()) / 7)}
          </p>
        </div>
        <div className="ml-auto">
          <span
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{
              color: scoreColor,
              background: `${scoreColor}18`,
              border: `1px solid ${scoreColor}40`,
            }}
          >
            {score >= 75 ? "OPTIMAL" : score >= 50 ? "BUILDING" : "START"}
          </span>
        </div>
      </div>

      <div className="px-5 pt-6 max-w-2xl mx-auto space-y-6">
        {/* ── Score + Chart ── */}
        <section className="glass rounded-3xl p-6 flex flex-col items-center gap-4">
          <ScoreCircle score={score} />
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Weighted composite of Metabolic (30%), Endurance (25%), Strength
            (25%), and Recovery (20%) pillars.
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
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={scoreColor}
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Pillar Cards ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Weekly Pillars
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <PillarCard
              icon={<Flame size={16} style={{ color: "#FF6B35" }} />}
              title="Nutrition"
              value={`${fastingDays}/7`}
              target="7/7 fasting days"
              unit="days"
              color="#FF6B35"
              score={pillars.metabolic / 0.3}
            />
            <PillarCard
              icon={<Dumbbell size={16} style={{ color: "#A78BFA" }} />}
              title="Strength"
              value={`${strengthSessions}/2`}
              target="2 sessions/week"
              unit="sessions"
              color="#A78BFA"
              score={pillars.strength / 0.25}
            />
            <PillarCard
              icon={<Activity size={16} style={{ color: "#00E5CC" }} />}
              title="Cardio"
              value={`${zone2Total}/150`}
              target="150 min Zone 2"
              unit="min"
              color="#00E5CC"
              score={pillars.endurance / 0.25}
            />
            <PillarCard
              icon={<Moon size={16} style={{ color: "#60A5FA" }} />}
              title="Recovery"
              value={avgSleep > 0 ? String(avgSleep) : "—"}
              target="8.0/10 avg sleep"
              unit="/ 10"
              color="#60A5FA"
              score={pillars.recovery / 0.2}
            />
          </div>
        </section>

        {/* ── Daily Input ── */}
        <section className="glass rounded-3xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-400" />
            <h2 className="text-sm font-bold text-white">
              Today&apos;s Log —{" "}
              <span className="text-slate-400 font-normal">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </h2>
          </div>

          {/* Fasting toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Fasting Window</p>
              <p className="text-xs text-slate-500">
                Done eating by 20:00? ({fastingDays}/7 this week)
              </p>
            </div>
            <button
              onClick={() => updateToday({ fasting: !today.fasting })}
              className="relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0"
              style={{
                background: today.fasting
                  ? "rgba(0,229,204,0.3)"
                  : "rgba(255,255,255,0.08)",
                border: today.fasting
                  ? "1px solid rgba(0,229,204,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  left: today.fasting ? "calc(100% - 24px)" : "4px",
                  background: today.fasting ? "#00E5CC" : "#475569",
                }}
              >
                {today.fasting && <Check size={12} color="#000" />}
              </span>
            </button>
          </div>

          <div className="h-px bg-white/5" />

          {/* Bio-metrics */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Bio-Metrics
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
                    updateToday({
                      hrv: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 text-center tabular-nums"
                />
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
                    updateToday({
                      rhr: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 text-center tabular-nums"
                />
              </div>
              {/* Sleep score */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 flex items-center gap-1">
                  <Moon size={11} className="text-blue-400" /> Sleep
                </label>
                <div className="relative flex items-center justify-center bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <span className="text-sm font-bold text-white tabular-nums">
                    {today.sleepQuality}
                  </span>
                  <span className="text-xs text-slate-500 ml-0.5">/10</span>
                </div>
              </div>
            </div>
            {/* Sleep slider */}
            <div className="mt-3">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={today.sleepQuality}
                onChange={(e) =>
                  updateToday({ sleepQuality: Number(e.target.value) })
                }
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #60A5FA ${
                    ((today.sleepQuality - 1) / 9) * 100
                  }%, rgba(255,255,255,0.08) ${
                    ((today.sleepQuality - 1) / 9) * 100
                  }%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>Poor</span>
                <span>Optimal</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Workout log */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Workout Log
            </p>

            {/* Zone 2 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Zone 2 Cardio</p>
                <p className="text-xs text-slate-500">
                  {today.zone2Minutes} min today · {zone2Total} / 150 min this week
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateToday({
                      zone2Minutes: Math.max(0, today.zone2Minutes - 10),
                    })
                  }
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-colors active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center text-sm font-bold text-white tabular-nums">
                  {today.zone2Minutes}m
                </span>
                <button
                  onClick={() =>
                    updateToday({ zone2Minutes: today.zone2Minutes + 10 })
                  }
                  className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 hover:bg-teal-500/20 transition-colors active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Strength training */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Strength Training
                </p>
                <p className="text-xs text-slate-500">
                  {strengthSessions} / 2 sessions this week
                </p>
              </div>
              <button
                onClick={() =>
                  updateToday({ strengthDone: !today.strengthDone })
                }
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: today.strengthDone
                    ? "rgba(167,139,250,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: today.strengthDone
                    ? "1px solid rgba(167,139,250,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: today.strengthDone ? "#A78BFA" : "#64748B",
                }}
              >
                <Dumbbell size={14} />
                {today.strengthDone ? "Done" : "Log Session"}
              </button>
            </div>
          </div>
        </section>

        {/* ── 7-Day History ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock size={12} /> 7-Day Activity Log
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
                  ? "Today"
                  : d.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });

                return (
                  <div
                    key={date}
                    className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={
                      isToday
                        ? { borderColor: "rgba(0,229,204,0.25)" }
                        : undefined
                    }
                  >
                    {/* Date */}
                    <div className="w-16 flex-shrink-0">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: isToday ? "#00E5CC" : "#94A3B8" }}
                      >
                        {label}
                      </p>
                    </div>

                    {/* Indicators */}
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <Dot
                        active={log.fasting}
                        color="#FF6B35"
                        label="Fast"
                      />
                      <Dot
                        active={log.zone2Minutes > 0}
                        color="#00E5CC"
                        label={
                          log.zone2Minutes > 0 ? `${log.zone2Minutes}m` : "Z2"
                        }
                      />
                      <Dot
                        active={log.strengthDone}
                        color="#A78BFA"
                        label="Str"
                      />
                      <Dot
                        active={log.sleepQuality >= 7}
                        color="#60A5FA"
                        label={`Slp ${log.sleepQuality}`}
                      />
                    </div>

                    {/* HRV / RHR */}
                    <div className="flex-shrink-0 text-right">
                      {log.hrv !== "" && (
                        <p className="text-xs text-rose-400 tabular-nums">
                          HRV {log.hrv}
                        </p>
                      )}
                      {log.rhr !== "" && (
                        <p className="text-xs text-amber-400 tabular-nums">
                          RHR {log.rhr}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ── Footer attribution ── */}
        <p className="text-center text-xs text-slate-700 pb-4">
          Protocol: Attia Outlive × Huberman Lab — Track. Optimize. Live Longer.
        </p>
      </div>
    </main>
  );
}

// ─── Dot badge ────────────────────────────────────────────────────────────────

function Dot({
  active,
  color,
  label,
}: {
  active: boolean;
  color: string;
  label: string;
}) {
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
