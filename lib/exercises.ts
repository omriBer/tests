export interface Exercise {
  id: string;
  name: string;
  muscle_primary: string;
  equipment: string;
  locations: string[];
  level: string;
  type: string;
  sets_default: number;
  reps_default: number;
  image_id?: string;
  [key: string]: unknown;
}

const EXERCISE_IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

let _cache: Exercise[] | null = null;
let _byId: Map<string, Exercise> | null = null;

export async function loadExercises(): Promise<Exercise[]> {
  if (_cache) return _cache;
  const res = await fetch("/data/exercises_db.json");
  _cache = (await res.json()) as Exercise[];
  _byId = new Map(_cache.map((ex) => [ex.id, ex]));
  return _cache;
}

export function getExercise(id: string): Exercise | undefined {
  return _byId?.get(id);
}

export function filterExercises(
  exercises: Exercise[],
  muscle?: string,
  equipment?: string,
  location?: string
): Exercise[] {
  let results = exercises;
  if (muscle) results = results.filter((e) => e.muscle_primary === muscle);
  if (equipment) results = results.filter((e) => e.equipment === equipment);
  if (location) results = results.filter((e) => e.locations?.includes(location));
  return results;
}

export function getExerciseGifUrl(exercise: Exercise): string | null {
  const imageId = exercise.image_id;
  if (!imageId) return null;
  return `${EXERCISE_IMAGE_BASE_URL}/${imageId}/0.gif`;
}

export function getExerciseImageUrl(exercise: Exercise): string | null {
  const imageId = exercise.image_id;
  if (!imageId) return null;
  return `${EXERCISE_IMAGE_BASE_URL}/${imageId}/0.jpg`;
}

export const EXERCISE_TIPS: Record<string, { do: string; dont: string }> = {
  pushup_standard: {
    do: "שמור על גוף ישר כמו קרש",
    dont: "אל תרשה לירכיים לצנוח",
  },
  squat_bodyweight: {
    do: "ברכיים בכיוון האצבעות",
    dont: "אל תרים את העקבים מהרצפה",
  },
  plank: {
    do: "כווץ בטן ושמור נשימה יציבה",
    dont: "אל תרים את הישבן למעלה",
  },
  lunges: {
    do: "ברך אחורית כמעט נוגעת ברצפה",
    dont: "אל תדחוף ברך קדמית מעבר לאצבעות",
  },
  crunch: {
    do: "הרם כתפיים, לא צוואר",
    dont: "אל תמשוך את הצוואר עם הידיים",
  },
  mountain_climber: {
    do: "שמור ידיים מתחת לכתפיים",
    dont: "אל תרים את הישבן גבוה מדי",
  },
  burpees: {
    do: "תנועה רציפה ומבוקרת",
    dont: "אל תדלג על השכיבת סמיכה",
  },
  glute_bridge: {
    do: "סחוט ישבן בנקודה העליונה",
    dont: "אל תקשת את הגב התחתון",
  },
  bicep_curl_dumbbell: {
    do: "מרפקים צמודים לגוף",
    dont: "אל תנדנד את הגוף לתנופה",
  },
  bench_press_dumbbell: {
    do: "כתפיים נעוצות בספסל",
    dont: "אל תרים את הגב מהספסל",
  },
  lat_pulldown: {
    do: "משוך לכיוון החזה, לא מאחורי הצוואר",
    dont: "אל תישען אחורה יותר מדי",
  },
  shoulder_press_dumbbell: {
    do: "דחוף ישר למעלה, לא קדימה",
    dont: "אל תקשת את הגב",
  },
  deadlift_dumbbell: {
    do: "גב ישר, ירכיים דוחפות אחורה",
    dont: "אל תעגל את הגב",
  },
  russian_twist: {
    do: "סובב את כל פלג הגוף העליון",
    dont: "אל תזיז רק את הידיים",
  },
  jump_squat: {
    do: "נחות רך על כריות כפות הרגליים",
    dont: "אל תנחת על ברכיים נעולות",
  },
};

export function getExerciseTips(
  exerciseId: string
): { do: string; dont: string } | null {
  return EXERCISE_TIPS[exerciseId] ?? null;
}
