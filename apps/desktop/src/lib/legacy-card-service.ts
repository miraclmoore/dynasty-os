import type { Player, PlayerSeason } from '@dynasty-os/core-types';
import { computeCareerStats, computeCareerAwards, computeSeasonCount } from './career-stats';
import { getAiCache, setAiCache } from './ai-cache-service';
import { callAnthropic } from './ai-bridge';
import { usePrefsStore } from '../store/prefs-store';

// Re-exports for callsite compatibility (D-02). Consumers (PlayerProfilePage,
// SeasonRecapPage, ScreenshotIngestionPage) currently import getApiKey/setApiKey
// from this file; the actual implementation now lives in prefs-service.
export { getApiKey, setApiKey, clearApiKey } from './prefs-service';

export interface LegacyCardData {
  player: Player;
  careerStats: Record<string, number>;
  careerAwards: string[];
  seasonCount: number;
  blurb?: string; // AI-generated, may be absent
}

// ── Blurb Cache Helpers ──────────────────────────────────────────────────────

const BLURB_CACHE_KEY_PREFIX = 'legacy-blurb-';

/**
 * Retrieves a cached legacy blurb from the Dexie aiCache table.
 * Returns null if not cached.
 */
export async function getCachedBlurb(dynastyId: string, playerId: string): Promise<string | null> {
  return getAiCache(dynastyId, BLURB_CACHE_KEY_PREFIX + playerId);
}

/**
 * Persists a generated legacy blurb to the Dexie aiCache table.
 */
export async function setCachedBlurb(dynastyId: string, playerId: string, blurb: string): Promise<void> {
  await setAiCache(dynastyId, BLURB_CACHE_KEY_PREFIX + playerId, 'legacy-blurb', blurb);
}

// ── Card Data Builder ────────────────────────────────────────────────────────

/**
 * Assembles all career data for a Legacy Card. Pure function — no side effects.
 */
export function buildLegacyCardData(
  player: Player,
  seasons: PlayerSeason[]
): LegacyCardData {
  return {
    player,
    careerStats: computeCareerStats(seasons),
    careerAwards: computeCareerAwards(seasons),
    seasonCount: computeSeasonCount(seasons),
  };
}

// ── Claude API Blurb Generator ───────────────────────────────────────────────

/**
 * Calls Claude Haiku to generate a Hall of Fame induction blurb for the player.
 * Returns null if no API key is configured or if the API call fails for any reason.
 * Never throws — the blurb is optional enhancement, not critical path.
 */
export async function generateLegacyBlurb(
  cardData: LegacyCardData,
  teamName: string
): Promise<string | null> {
  if (!usePrefsStore.getState().hasApiKey) {
    return null;
  }

  const { player, careerStats, careerAwards, seasonCount } = cardData;

  // Build a stats summary string — top 5 non-zero stats
  const topStats = Object.entries(careerStats)
    .filter(([, v]) => v !== 0)
    .slice(0, 5)
    .map(([k, v]) => `${formatStatKey(k)}: ${typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : v}`)
    .join(', ');

  const awardsText = careerAwards.length > 0
    ? `Career awards: ${careerAwards.join(', ')}.`
    : 'No individual awards.';

  const departureText = player.status !== 'active'
    ? `Departure type: ${player.status}.`
    : '';

  const userMessage =
    `Player: ${player.firstName} ${player.lastName}\n` +
    `Position: ${player.position}\n` +
    `Team: ${teamName}\n` +
    `Seasons played: ${seasonCount}\n` +
    `Career stats — ${topStats || 'No statistics recorded'}.\n` +
    `${awardsText}\n` +
    `${departureText}`.trim();

  const systemPrompt =
    'You are a college football Hall of Fame ceremony announcer. Write a 2-3 sentence Hall of Fame induction blurb for a departing player. Be specific about their stats. Be dramatic but not corny. No emojis.';

  try {
    const data = await callAnthropic({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    if (!data) return null;
    const text: string | undefined = data?.content?.[0]?.text;
    if (!text) {
      console.warn('[LegacyCard] Claude API response missing text content');
      return null;
    }

    return text.trim();
  } catch (err) {
    console.warn('[LegacyCard] Claude API call failed:', err);
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts camelCase stat keys to readable labels.
 * e.g. "passingYards" → "Passing Yards"
 */
function formatStatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
