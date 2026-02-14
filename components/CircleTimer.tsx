"use client";

import { useEffect, useState } from "react";

interface Props {
  duration: number; // seconds
  onComplete: () => void;
  isRunning: boolean;
}

export default function CircleTimer({ duration, onComplete, isRunning }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
  }, [duration]);

  useEffect(() => {
    if (!isRunning) return;
    if (elapsed >= duration) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= duration) {
          onComplete();
          return duration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, elapsed, duration, onComplete]);

  const remaining = Math.max(0, duration - elapsed);
  const progress = duration > 0 ? elapsed / duration : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#30363D"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#00E676"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{
            transition: "stroke-dashoffset 1s linear",
            filter: "drop-shadow(0 0 6px rgba(0, 230, 118, 0.5))",
          }}
        />
      </svg>
      <span className="absolute text-lg font-bold text-white">
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
