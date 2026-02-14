"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGhostCoachMessage } from "@/lib/coach";

interface Props {
  context: string;
  exercisesCount: number;
  duration: number;
  muscle: string | null;
}

export default function GhostCoach({ context, exercisesCount, duration, muscle }: Props) {
  const [visible, setVisible] = useState(true);
  const message = getGhostCoachMessage(context, exercisesCount, duration, muscle);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-50"
          onClick={() => setVisible(false)}
        >
          <div className="glass neon-glow p-4 rounded-2xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👻</span>
              <div className="flex-1 text-sm whitespace-pre-line leading-relaxed">
                {message}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
