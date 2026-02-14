const GHOST_COACH_MESSAGES = [
  "אלוף! עוד אימון בכיס. הגוף מודה לך!",
  "סגרת את זה! כל אימון מקרב אותך למטרה.",
  "מכונה! ההתמדה שלך מרשימה.",
  "נהדר! הגוף שלך כבר מרגיש את ההבדל.",
  "עבודה! עוד יום של גדילה.",
];

const GHOST_COACH_BY_CONTEXT: Record<string, string> = {
  microwave: "2 דקות שעשו את ההבדל! גם מיקרו-אימון סופר.",
  zoom: "שברת את הישיבה! הגב והצוואר מודים לך.",
  kid: "אימון משפחתי = דוגמה אישית מהטובות!",
  home: "ביתי אבל אמיתי! כל הכבוד.",
  gym: "חדר כושר ✓ עוד אימון מקצועי מאחוריך!",
  outdoor: "אוויר צח + תנועה = השילוב המנצח!",
};

export function getGhostCoachMessage(
  context?: string,
  exercisesCount?: number,
  duration?: number,
  muscle?: string | null
): string {
  const parts: string[] = [];

  if (context && GHOST_COACH_BY_CONTEXT[context]) {
    parts.push(GHOST_COACH_BY_CONTEXT[context]);
  } else {
    parts.push(
      GHOST_COACH_MESSAGES[Math.floor(Math.random() * GHOST_COACH_MESSAGES.length)]
    );
  }

  if (exercisesCount && exercisesCount > 0 && duration && duration > 0) {
    const muscleText = muscle ? ` | ${muscle}` : "";
    parts.push(`📊 ${exercisesCount} תרגילים · ${duration} דק׳${muscleText}`);
  }

  return parts.join("\n");
}
