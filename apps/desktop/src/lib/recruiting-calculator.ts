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
 * Returns Hard Sell recommendation when all 3 grades are present and recognized.
 * Returns null if any grade is missing or unrecognized (guard against partial
 * or invalid parses — gradeToPoints returns 0 for unknown grade strings).
 */
export function getHardSellRecommendation(
  grade1: string | null | undefined,
  grade2: string | null | undefined,
  grade3: string | null | undefined,
): HardSellResult {
  if (!grade1 || !grade2 || !grade3) return null;
  const p1 = gradeToPoints(grade1);
  const p2 = gradeToPoints(grade2);
  const p3 = gradeToPoints(grade3);
  // Treat any unrecognized grade (0 points) as missing data to avoid a
  // spurious 'Send the House' recommendation (0+0+0=0 < 19).
  if (p1 === 0 || p2 === 0 || p3 === 0) return null;
  const total = p1 + p2 + p3;
  return total >= 19 ? 'Hard Sell' : 'Send the House';
}
