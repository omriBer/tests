export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealEntry {
  id: string;
  meal: MealType;
  name: string;
  calories: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export const DAILY_GOAL = 2000;

export const MEAL_CONFIG: Record<
  MealType,
  { label: string; icon: string; budget: number }
> = {
  breakfast: { label: "בוקר",   icon: "🌅", budget: 500 },
  lunch:     { label: "צהריים", icon: "🌞", budget: 700 },
  dinner:    { label: "ערב",    icon: "🌙", budget: 600 },
  snack:     { label: "נשנוש",  icon: "🍎", budget: 200 },
};

const STORAGE_KEY = "fitnessmate_meals";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function getAll(): MealEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: MealEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addMeal(meal: MealType, name: string, calories: number): void {
  const all = getAll();
  all.push({
    id: crypto.randomUUID(),
    meal,
    name: name.trim() || MEAL_CONFIG[meal].label,
    calories,
    date: today(),
    timestamp: Date.now(),
  });
  saveAll(all);
}

export function removeMeal(id: string): void {
  saveAll(getAll().filter((e) => e.id !== id));
}

export function getTodayEntries(): MealEntry[] {
  return getAll().filter((e) => e.date === today());
}

export function getTodayByMeal(): Record<MealType, MealEntry[]> {
  const entries = getTodayEntries();
  return {
    breakfast: entries.filter((e) => e.meal === "breakfast"),
    lunch:     entries.filter((e) => e.meal === "lunch"),
    dinner:    entries.filter((e) => e.meal === "dinner"),
    snack:     entries.filter((e) => e.meal === "snack"),
  };
}

export function getTodayTotal(): number {
  return getTodayEntries().reduce((sum, e) => sum + e.calories, 0);
}
