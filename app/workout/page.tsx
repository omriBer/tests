"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import ContextCards from "@/components/ContextCards";
import GearCards from "@/components/GearCards";
import MuscleMap from "@/components/MuscleMap";
import WorkoutPlayer from "@/components/WorkoutPlayer";
import Summary from "@/components/Summary";
import GhostCoach from "@/components/GhostCoach";
import { matchTemplates, type ContextKey, type GearKey, type Template } from "@/lib/templates";
import { saveWorkout } from "@/lib/storage";
import { getTodayTotal, DAILY_GOAL } from "@/lib/mealStorage";
import { getTodayGlasses, DAILY_GOAL_GLASSES } from "@/lib/waterStorage";

type Screen = "context" | "gear" | "muscle" | "player" | "summary";

function FloatingNav() {
  const calories = getTodayTotal();
  const calPct = calories / DAILY_GOAL;
  const calColor = calPct < 0.6 ? "#00E676" : calPct < 0.85 ? "#FFD60A" : "#FF5252";

  const glasses = getTodayGlasses();
  const waterPct = glasses / DAILY_GOAL_GLASSES;
  const waterColor = waterPct < 0.5 ? "#00B8FF" : waterPct < 0.85 ? "#00E676" : "#FFD60A";

  return (
    <div className="fixed top-4 left-4 z-40 flex gap-2">
      <Link
        href="/"
        className="flex items-center gap-1.5 px-3 py-2 glass glass-hover rounded-full text-sm font-bold text-white/60"
      >
        🏠
      </Link>
      <Link
        href="/meals"
        className="flex items-center gap-1.5 px-3 py-2 glass glass-hover rounded-full text-sm font-bold"
        style={{ color: calColor }}
      >
        🍽 {calories > 0 ? `${calories} קל` : "ארוחות"}
      </Link>
      <Link
        href="/water"
        className="flex items-center gap-1.5 px-3 py-2 glass glass-hover rounded-full text-sm font-bold"
        style={{ color: waterColor }}
      >
        💧 {glasses > 0 ? `${glasses}/${DAILY_GOAL_GLASSES}` : "שתיה"}
      </Link>
    </div>
  );
}

export default function WorkoutPage() {
  const [screen, setScreen] = useState<Screen>("context");
  const [selectedContext, setSelectedContext] = useState<ContextKey | null>(null);
  const [selectedGear, setSelectedGear] = useState<GearKey | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [completedDuration, setCompletedDuration] = useState(0);
  const [showGhostCoach, setShowGhostCoach] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const handleContextSelect = useCallback((context: ContextKey) => {
    setSelectedContext(context);
    if (context === "microwave" || context === "zoom") {
      setSelectedGear("none");
      setScreen("muscle");
    } else {
      setScreen("gear");
    }
  }, []);

  const handleGearSelect = useCallback((gear: GearKey) => {
    setSelectedGear(gear);
    setScreen("muscle");
  }, []);

  const handleMuscleSelect = useCallback(
    (muscle: string) => {
      setSelectedMuscle(muscle);
      const templates = matchTemplates(
        selectedContext || undefined,
        selectedGear || undefined,
        muscle
      );
      if (templates.length > 0) {
        const pick =
          muscle === "הפתעה"
            ? templates[Math.floor(Math.random() * templates.length)]
            : templates[0];
        setSelectedTemplate(pick);
        setScreen("player");
      } else {
        const fallback = matchTemplates(selectedContext || undefined, selectedGear || undefined);
        if (fallback.length > 0) {
          setSelectedTemplate(fallback[Math.floor(Math.random() * fallback.length)]);
          setScreen("player");
        }
      }
    },
    [selectedContext, selectedGear]
  );

  const handleWorkoutComplete = useCallback(
    (exercisesCount: number, durationMinutes: number) => {
      setCompletedExercises(exercisesCount);
      setCompletedDuration(durationMinutes);
      if (selectedTemplate) {
        saveWorkout({
          date: new Date().toISOString().split("T")[0],
          context: selectedContext || "",
          gear: selectedGear || "",
          muscle: selectedMuscle,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          exercisesCount,
          durationMinutes,
        });
      }
      setShowGhostCoach(true);
      setScreen("summary");
    },
    [selectedTemplate, selectedContext, selectedGear, selectedMuscle]
  );

  const resetToStart = useCallback(() => {
    setScreen("context");
    setSelectedContext(null);
    setSelectedGear(null);
    setSelectedMuscle(null);
    setSelectedTemplate(null);
    setShowGhostCoach(false);
  }, []);

  return (
    <main className="min-h-dvh">
      <AnimatePresence mode="wait">
        {screen === "context" && (
          <motion.div
            key="context"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FloatingNav />
            <ContextCards onSelect={handleContextSelect} />
          </motion.div>
        )}

        {screen === "gear" && (
          <motion.div
            key="gear"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <GearCards onSelect={handleGearSelect} />
          </motion.div>
        )}

        {screen === "muscle" && (
          <motion.div
            key="muscle"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <MuscleMap onSelect={handleMuscleSelect} />
          </motion.div>
        )}

        {screen === "player" && selectedTemplate && (
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-dvh"
          >
            <WorkoutPlayer
              template={selectedTemplate}
              onComplete={handleWorkoutComplete}
            />
          </motion.div>
        )}

        {screen === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Summary
              exercisesCount={completedExercises}
              durationMinutes={completedDuration}
              templateName={selectedTemplate?.name || "אימון"}
              muscle={selectedMuscle}
              onNewWorkout={resetToStart}
              onDone={resetToStart}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showGhostCoach && selectedContext && (
        <GhostCoach
          context={selectedContext}
          exercisesCount={completedExercises}
          duration={completedDuration}
          muscle={selectedMuscle}
        />
      )}
    </main>
  );
}
