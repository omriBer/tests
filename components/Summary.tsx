"use client";

import { motion } from "framer-motion";
import { getStreak, getWeeklyCount } from "@/lib/storage";

interface Props {
  exercisesCount: number;
  durationMinutes: number;
  templateName: string;
  muscle: string | null;
  onNewWorkout: () => void;
  onDone: () => void;
}

export default function Summary({
  exercisesCount,
  durationMinutes,
  templateName,
  muscle,
  onNewWorkout,
  onDone,
}: Props) {
  const streak = getStreak();
  const weeklyCount = getWeeklyCount();

  const weeklyMessage =
    weeklyCount === 0
      ? "השבוע עוד לא התאמנת. בוא נתחיל!"
      : weeklyCount <= 2
        ? `השבוע ${weeklyCount} אימונים. עוד קצת!`
        : weeklyCount <= 4
          ? `שבוע מצוין! ${weeklyCount} אימונים!`
          : `שבוע מטורף! ${weeklyCount} אימונים!`;

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-dvh justify-center">
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="text-6xl mb-4"
      >
        🎉
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold neon-text mb-2"
      >
        כל הכבוד!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-[#8B949E] mb-8"
      >
        {templateName}
      </motion.p>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6"
      >
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-[#00E676]">{exercisesCount}</div>
          <div className="text-[#8B949E] text-xs">תרגילים</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-[#00E676]">{durationMinutes}</div>
          <div className="text-[#8B949E] text-xs">דקות</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">
            {streak} 🔥
          </div>
          <div className="text-[#8B949E] text-xs">ימים ברצף</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{weeklyCount}</div>
          <div className="text-[#8B949E] text-xs">השבוע</div>
        </div>
      </motion.div>

      {/* Muscle */}
      {muscle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[#8B949E] text-sm mb-4"
        >
          🎯 {muscle}
        </motion.div>
      )}

      {/* Weekly Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass p-3 text-center text-sm text-[#8B949E] w-full max-w-sm mb-8"
      >
        📊 {weeklyMessage}
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex gap-3 w-full max-w-sm"
      >
        <button
          onClick={onNewWorkout}
          className="flex-1 py-4 rounded-xl bg-[#00E676] text-black font-bold active:scale-95 transition-transform"
        >
          עוד אימון 💪
        </button>
        <button
          onClick={onDone}
          className="flex-1 py-4 rounded-xl glass glass-hover font-bold text-[#8B949E]"
        >
          סיימתי ✓
        </button>
      </motion.div>
    </div>
  );
}
