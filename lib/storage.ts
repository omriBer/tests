export interface SavedWorkout {
  id: string;
  date: string;
  context: string;
  gear: string;
  muscle: string | null;
  templateId: string;
  templateName: string;
  exercisesCount: number;
  durationMinutes: number;
  timestamp: number;
}

const WORKOUTS_KEY = "fitnessmate_workouts";

function getAll(): SavedWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKOUTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWorkout(workout: Omit<SavedWorkout, "id" | "timestamp">): void {
  const all = getAll();
  all.push({
    ...workout,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(all));
}

export function getWorkouts(): SavedWorkout[] {
  return getAll().sort((a, b) => b.timestamp - a.timestamp);
}

export function getStreak(): number {
  const workouts = getAll();
  if (workouts.length === 0) return 0;

  const dates = new Set(workouts.map((w) => w.date));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (dates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

export function getWeeklyCount(): number {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return getAll().filter((w) => w.timestamp >= weekAgo).length;
}
