import type { Player } from '@dynasty-os/core-types';

/**
 * Normalizes a name string for comparison:
 *  - lowercases
 *  - strips punctuation (apostrophes, hyphens, periods)
 *  - collapses multiple spaces to one
 *  - trims
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a similarity score in [0, 1] between two player name strings.
 *
 * Scoring tiers (evaluated in order — first match wins):
 *   1.0  — normalized strings are identical (exact match)
 *   0.85 — one normalized string is a substring of the other
 *   n    — character set overlap: |intersection| / max(|setA|, |setB|)
 *
 * Character set is the unique set of characters after normalization
 * (spaces included so "jo" and "joe" differ slightly).
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Short names (≤2 chars after normalization) have too few unique characters
  // for set-overlap scoring to be meaningful — the small character sets produce
  // high scores against unrelated names (e.g., "Bo" vs "Bob" → 1.0). Fall back
  // to 0 (no match) so these short fragments don't silently match wrong players.
  if (na.length <= 2 || nb.length <= 2) return 0;

  const setA = new Set(na.split(''));
  const setB = new Set(nb.split(''));
  let intersection = 0;
  for (const ch of setA) {
    if (setB.has(ch)) intersection++;
  }
  const maxSize = Math.max(setA.size, setB.size);
  return maxSize === 0 ? 0 : intersection / maxSize;
}

/**
 * Finds the best-matching Player from an array given a raw name string
 * (e.g., from a parsed screenshot).
 *
 * Compares `candidateName` against `${player.firstName} ${player.lastName}`
 * for every player. Returns the player with the highest similarity score,
 * provided that score is >= 0.4. Returns null if no player meets the threshold.
 */
export function findBestPlayerMatch(
  candidateName: string,
  players: Player[]
): { player: Player; score: number } | null {
  if (!candidateName.trim() || players.length === 0) return null;

  let best: { player: Player; score: number } | null = null;

  for (const player of players) {
    const fullName = `${player.firstName} ${player.lastName}`;
    const score = nameSimilarity(candidateName, fullName);
    if (score >= 0.4 && (!best || score > best.score)) {
      best = { player, score };
    }
  }

  return best;
}
