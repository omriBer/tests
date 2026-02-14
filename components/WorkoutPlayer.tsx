"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CircleTimer from "./CircleTimer";
import { type Template, type TemplateExercise } from "@/lib/templates";
import { loadExercises, getExercise, getExerciseGifUrl, getExerciseTips, type Exercise } from "@/lib/exercises";

interface Props {
  template: Template;
  onComplete: (exercisesCount: number, durationMinutes: number) => void;
}

interface ActiveExercise extends TemplateExercise {
  phase: "warmup" | "effort" | "stretch";
  data?: Exercise;
  gifUrl?: string | null;
  tips?: { do: string; dont: string } | null;
}

export default function WorkoutPlayer({ template, onComplete }: Props) {
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    async function build() {
      await loadExercises();

      const all: ActiveExercise[] = [];

      // Warmup (1 exercise if available)
      if (template.warmup.length > 0) {
        const warmupId = template.warmup[0];
        const data = getExercise(warmupId);
        all.push({
          exercise_id: warmupId,
          sets: 1,
          reps: 1,
          rest_sec: 0,
          phase: "warmup",
          data,
          gifUrl: data ? getExerciseGifUrl(data) : null,
          tips: getExerciseTips(warmupId),
        });
      }

      // Main exercises (effort phase)
      for (const ex of template.exercises) {
        const data = getExercise(ex.exercise_id);
        all.push({
          ...ex,
          phase: "effort",
          data,
          gifUrl: data ? getExerciseGifUrl(data) : null,
          tips: getExerciseTips(ex.exercise_id),
        });
      }

      // Cooldown (1 exercise if available)
      if (template.cooldown.length > 0) {
        const cooldownId = template.cooldown[0];
        const data = getExercise(cooldownId);
        all.push({
          exercise_id: cooldownId,
          sets: 1,
          reps: 1,
          rest_sec: 0,
          phase: "stretch",
          data,
          gifUrl: data ? getExerciseGifUrl(data) : null,
          tips: getExerciseTips(cooldownId),
        });
      }

      setExercises(all);
      setLoaded(true);
    }
    build();
  }, [template]);

  const handleTimerComplete = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const elapsed = Math.round((Date.now() - startTime) / 60000);
      onComplete(exercises.length, elapsed || template.duration_minutes);
    }
  }, [currentIndex, exercises.length, onComplete, startTime, template.duration_minutes]);

  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const elapsed = Math.round((Date.now() - startTime) / 60000);
      onComplete(exercises.length, elapsed || template.duration_minutes);
    }
  }, [currentIndex, exercises.length, onComplete, startTime, template.duration_minutes]);

  if (!loaded || exercises.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-[#8B949E] text-lg">טוען אימון...</div>
      </div>
    );
  }

  const current = exercises[currentIndex];
  const exerciseName = current.data?.name || current.exercise_id.replace(/_/g, " ");
  const phaseLabel =
    current.phase === "warmup"
      ? "🔥 חימום"
      : current.phase === "stretch"
        ? "🧘 מתיחה"
        : "💪 אימון";

  const phaseColor =
    current.phase === "warmup"
      ? "text-orange-400"
      : current.phase === "stretch"
        ? "text-blue-400"
        : "text-[#00E676]";

  return (
    <div className="flex flex-col min-h-dvh">
      {/* GIF Hero - 80-90% of screen */}
      <div className="relative flex-1 flex items-center justify-center bg-black/30 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex items-center justify-center p-2"
          >
            {current.gifUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.gifUrl}
                alt={exerciseName}
                className="max-h-full max-w-full object-contain rounded-xl"
                style={{ maxHeight: "70vh" }}
              />
            ) : (
              <div className="text-6xl">🏋️</div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Phase badge */}
        <div className={`absolute top-3 right-3 ${phaseColor} text-sm font-bold glass px-3 py-1`}>
          {phaseLabel}
        </div>

        {/* Progress */}
        <div className="absolute top-3 left-3 text-[#8B949E] text-sm glass px-3 py-1">
          {currentIndex + 1} / {exercises.length}
        </div>

        {/* DO / DON'T tips */}
        {current.tips && (
          <div className="absolute bottom-16 left-3 right-3 flex gap-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass px-3 py-2 text-xs flex-1"
            >
              <span className="text-green-400">✅ </span>
              {current.tips.do}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="glass px-3 py-2 text-xs flex-1"
            >
              <span className="text-red-400">❌ </span>
              {current.tips.dont}
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="glass p-4 mx-2 mb-2 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 text-right">
            <h2 className="text-lg font-bold text-white">{exerciseName}</h2>
            <p className="text-[#8B949E] text-sm">
              {current.sets} × {current.reps} {current.reps > 10 ? "שניות" : "חזרות"}
            </p>
          </div>

          <CircleTimer
            duration={60}
            onComplete={handleTimerComplete}
            isRunning={isRunning}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="glass glass-hover flex-1 py-3 text-center font-bold text-[#8B949E]"
          >
            {isRunning ? "⏸ השהה" : "▶ המשך"}
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3 text-center font-bold rounded-xl bg-[#00E676] text-black active:scale-95 transition-transform"
          >
            {currentIndex < exercises.length - 1 ? "הבא ←" : "סיום ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
