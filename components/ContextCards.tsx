"use client";

import { motion } from "framer-motion";
import { CONTEXTS, type ContextKey } from "@/lib/templates";
import { getGarminData, getEnergySuggestion } from "@/lib/garmin";

interface Props {
  onSelect: (context: ContextKey) => void;
}

const contextOrder: ContextKey[] = [
  "microwave",
  "zoom",
  "kid",
  "home",
  "gym",
  "outdoor",
];

export default function ContextCards({ onSelect }: Props) {
  const garmin = getGarminData();
  const energy = getEnergySuggestion(garmin);
  const lowBB = garmin.bodyBattery < 40;

  const lightContexts: ContextKey[] = ["microwave", "zoom"];

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-dvh">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-2 neon-text"
      >
        מה המצב?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[#8B949E] text-sm mb-6"
      >
        בחר את הסיטואציה שלך
      </motion.p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {contextOrder.map((key, i) => {
          const ctx = CONTEXTS[key];
          const shouldPulse = lowBB && lightContexts.includes(key);

          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(key)}
              className={`glass glass-hover no-select p-5 flex flex-col items-center gap-2 min-h-[120px] justify-center ${
                shouldPulse ? "pulse-glow" : ""
              }`}
            >
              <span className="text-3xl">{ctx.emoji}</span>
              <span className="text-white font-bold text-sm">{ctx.label}</span>
              <span className="text-[#8B949E] text-xs">{ctx.desc}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Silent Garmin bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 flex items-center gap-3 text-xs text-[#8B949E]"
      >
        <span>⌚</span>
        <span>BB {garmin.bodyBattery}</span>
        <span>·</span>
        <span>שינה {garmin.sleepHours}h</span>
        <span>·</span>
        <span>סטרס {garmin.stress}</span>
        <span>·</span>
        <span>אנרגיה: {energy === "high" ? "גבוהה" : energy === "medium" ? "בינונית" : "נמוכה"}</span>
      </motion.div>
    </div>
  );
}
