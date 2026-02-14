"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ContextCards from "@/components/ContextCards";
import GearCards from "@/components/GearCards";
import MuscleMap from "@/components/MuscleMap";
import WorkoutPlayer from "@/components/WorkoutPlayer";
import Summary from "@/components/Summary";
import GhostCoach from "@/components/GhostCoach";
import { matchTemplates, type ContextKey, type GearKey, type Template } from "@/lib/templates";
import { saveWorkout } from "@/lib/storage";

type Screen = "context" | "gear" | "muscle" | "player" | "summary";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("context");
  const [selectedContext, setSelectedContext] = useState<ContextKey | null>(null);
  const [selectedGear, setSelectedGear] = useState<GearKey | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [completedDuration, setCompletedDuration] = useState(0);
  const [showGhostCoach, setShowGhostCoach] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const handleContextSelect = useCallback((context: ContextKey) => {
    setSelectedContext(context);
    // Auto-skip gear for microwave/zoom
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

      // Find a matching template
      const templates = matchTemplates(
        selectedContext || undefined,
        selectedGear || undefined,
        muscle
      );

      if (templates.length > 0) {
        // Pick a random one if "הפתעה", otherwise first match
        const pick =
          muscle === "הפתעה"
            ? templates[Math.floor(Math.random() * templates.length)]
            : templates[0];
        setSelectedTemplate(pick);
        setScreen("player");
      } else {
        // Fallback: broaden search
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

      // Save to localStorage
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

      {/* Ghost Coach Toast */}
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
