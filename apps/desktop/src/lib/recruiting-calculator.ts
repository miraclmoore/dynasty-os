/**
 * CFB 26 motivation grade point values (A+=13 down to F=1).
 * Used for the Rule of 19 Hard Sell calculation.
 * Source: dynasty-os-claude-code-handoff.md lines 963-994
 */
const GRADE_POINTS: Record<string, number> = {
  'A+': 13, 'A': 12, 'A-': 11,
  'B+': 10, 'B': 9,  'B-': 8,
  'C+': 7,  'C': 6,  'C-': 5,
  'D+': 4,  'D': 3,  'D-': 2,
  'F': 1,
};

export function gradeToPoints(grade: string): number {
  return GRADE_POINTS[grade.trim()] ?? 0;
}

export type HardSellResult = 'Hard Sell' | 'Send the House' | null;

/**
 * Returns Hard Sell recommendation when all 3 grades are present.
 * Returns null if any grade is missing (guard against partial parse).
 */
export function getHardSellRecommendation(
  grade1: string | null | undefined,
  grade2: string | null | undefined,
  grade3: string | null | undefined,
): HardSellResult {
  if (!grade1 || !grade2 || !grade3) return null;
  const total = gradeToPoints(grade1) + gradeToPoints(grade2) + gradeToPoints(grade3);
  return total >= 19 ? 'Hard Sell' : 'Send the House';
}
