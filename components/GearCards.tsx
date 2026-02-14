"use client";

import { motion } from "framer-motion";
import { GEARS, type GearKey } from "@/lib/templates";

interface Props {
  onSelect: (gear: GearKey) => void;
}

const gearOrder: GearKey[] = ["none", "basic", "full"];

export default function GearCards({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-dvh">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-2 neon-text"
      >
        מה יש לך?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[#8B949E] text-sm mb-8"
      >
        איזה ציוד זמין
      </motion.p>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {gearOrder.map((key, i) => {
          const gear = GEARS[key];
          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(key)}
              className="glass glass-hover no-select p-6 flex items-center gap-4"
            >
              <span className="text-4xl">{gear.emoji}</span>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{gear.label}</div>
                <div className="text-[#8B949E] text-sm">{gear.desc}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
