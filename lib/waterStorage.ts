export const DAILY_GOAL_GLASSES = 10; // 2.5L ÷ 250ml
export const GLASS_ML = 250;

export type PreMealType = "breakfast" | "lunch" | "dinner";

export interface WaterEntry {
  id: string;
  glasses: number;
  timestamp: number;
  date: string;
  preMeal?: PreMealType;
}

export interface EatingWindow {
  start: number | null; // timestamp
  durationHours: number; // 8 | 10 | 12
}

// ─── Leptin phases ──────────────────────────────────────────────────────────

export interface LeptinPhase {
  name: string;
  weeks: string;
  rules: string[];
  color: string;
}

export const LEPTIN_PHASES: LeptinPhase[] = [
  {
    name: "ההצפה הלפטינית",
    weeks: "שבועות 1–2",
    color: "#00E676",
    rules: [
      "מותר לאכול הכל – אין הגבלת סוגי מזון",
      "חובה: 2 כוסות מים לפני כל אכילה",
      "יעד: 2–4 ליטר מים ביום",
      "שבוע 2: הוסף ירקות מנקים (50% מהצלחת)",
    ],
  },
  {
    name: "הניקוי הלפטיני",
    weeks: "שבועות 3–7",
    color: "#00B8FF",
    rules: [
      "אסור: סוכר, קמחים, אורז, תפו\"א, בטטה",
      "אסור: פירות יבשים, מוצרי חלב ניגר (מעל 40מ\"ל)",
      "מותר: קטניות, קינואה, כוסמת, שיבולת שועל",
      "פרי אחד ביום (תותים/פירות יער – ללא הגבלה)",
      "חלון אכילה: 8–12 שעות",
    ],
  },
  {
    name: "טרנספורמציה מנטלית",
    weeks: "שבוע 8",
    color: "#FFD60A",
    rules: [
      "אין שינוי תזונתי – כמו שבוע 7",
      "תרגיל קריפטונייט: חשיפה למאכל ממכר ללא אכילה",
      "המשך שתייה ועמידה בחלון אכילה",
    ],
  },
  {
    name: "שלב המסלולים",
    weeks: "שבועות 9–12",
    color: "#FF6B35",
    rules: [
      "מסלול מהיר: רק קטניות + 2 ימי פינוק בשבוע",
      "מסלול ניקוי: קטניות + קינואה/כוסמת + יום פינוק עשיר",
      "מסלול מתון: קטניות + מנת פחמימה אחת/יום + יום פינוק",
    ],
  },
];

export function getLeptinPhase(startDate: string | null): LeptinPhase & { week: number } {
  if (!startDate) return { ...LEPTIN_PHASES[0], week: 1 };
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysPassed / 7) + 1;

  let phase: LeptinPhase;
  if (week <= 2) phase = LEPTIN_PHASES[0];
  else if (week <= 7) phase = LEPTIN_PHASES[1];
  else if (week === 8) phase = LEPTIN_PHASES[2];
  else phase = LEPTIN_PHASES[3];

  return { ...phase, week };
}

// ─── Storage keys ────────────────────────────────────────────────────────────

const KEY_WATER = "fitnessmate_water";
const KEY_LEPTIN_START = "fitnessmate_leptin_start";
const KEY_EATING_WINDOW = "fitnessmate_eating_window";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function getAll(): WaterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_WATER);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: WaterEntry[]): void {
  localStorage.setItem(KEY_WATER, JSON.stringify(entries));
}

// ─── Water entries ───────────────────────────────────────────────────────────

export function addGlasses(count: number, preMeal?: PreMealType): void {
  const all = getAll();
  all.push({
    id: crypto.randomUUID(),
    glasses: count,
    timestamp: Date.now(),
    date: today(),
    preMeal,
  });
  saveAll(all);
}

export function removeWaterEntry(id: string): void {
  saveAll(getAll().filter((e) => e.id !== id));
}

export function getTodayEntries(): WaterEntry[] {
  return getAll().filter((e) => e.date === today());
}

export function getTodayGlasses(): number {
  return getTodayEntries().reduce((sum, e) => sum + e.glasses, 0);
}

export function getTodayMl(): number {
  return getTodayGlasses() * GLASS_ML;
}

// which pre-meal drinks were done today
export function getPreMealDone(): Record<PreMealType, boolean> {
  const entries = getTodayEntries();
  const done = (m: PreMealType) =>
    entries.filter((e) => e.preMeal === m).reduce((s, e) => s + e.glasses, 0) >= 2;
  return { breakfast: done("breakfast"), lunch: done("lunch"), dinner: done("dinner") };
}

// ─── Eating window ───────────────────────────────────────────────────────────

export function getEatingWindow(): EatingWindow {
  if (typeof window === "undefined") return { start: null, durationHours: 10 };
  try {
    const raw = localStorage.getItem(KEY_EATING_WINDOW);
    if (!raw) return { start: null, durationHours: 10 };
    const w = JSON.parse(raw) as EatingWindow;
    // Reset if start was yesterday
    if (w.start) {
      const startDate = new Date(w.start).toISOString().split("T")[0];
      if (startDate !== today()) return { start: null, durationHours: w.durationHours };
    }
    return w;
  } catch {
    return { start: null, durationHours: 10 };
  }
}

export function startEatingWindow(durationHours: number = 10): void {
  const w = getEatingWindow();
  localStorage.setItem(
    KEY_EATING_WINDOW,
    JSON.stringify({ start: Date.now(), durationHours })
  );
}

export function setEatingWindowDuration(hours: number): void {
  const w = getEatingWindow();
  localStorage.setItem(KEY_EATING_WINDOW, JSON.stringify({ ...w, durationHours: hours }));
}

export function resetEatingWindow(): void {
  const w = getEatingWindow();
  localStorage.setItem(KEY_EATING_WINDOW, JSON.stringify({ start: null, durationHours: w.durationHours }));
}

// ─── Leptin program ──────────────────────────────────────────────────────────

export function getLeptinStartDate(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_LEPTIN_START);
}

export function setLeptinStartDate(date: string): void {
  localStorage.setItem(KEY_LEPTIN_START, date);
}
