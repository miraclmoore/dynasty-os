import { db } from '@dynasty-os/db';
import type { Dynasty, Season } from '@dynasty-os/core-types';
import { getApiKey } from './legacy-card-service';
import { getGamesBySeason } from './game-service';
import { getPlayerSeasonsBySeason } from './player-season-service';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NarrativeTone = 'espn' | 'hometown' | 'legend';

export interface SeasonNarrative {
  recap: string;
  tagline: string;
  tone: NarrativeTone;
  generatedAt: number;
}

interface NarrativeContext {
  dynasty: Dynasty;
  season: Season;
  gameLog: string;
  topPlayers: string;
}

// ── Tone System Prompts ───────────────────────────────────────────────────────

const TONE_SYSTEM_PROMPTS: Record<NarrativeTone, string> = {
  espn: `You are a national sports anchor at ESPN delivering a season summary for a prime-time broadcast. Write with authority and polish. You are statistics-driven — specific numbers are your currency. Reference historical context when relevant. Treat every milestone as significant on the national stage. Use phrases like "in a season that will be remembered" and always cite specific numbers. Your voice is confident, authoritative, and network-quality. Write a 2-3 paragraph season recap. Do not use emojis.

END your response with exactly this format on its own line: TAGLINE: [three-word tagline]. The tagline must be EXACTLY 3 words — no more, no less. It should capture the essence of the season.`,

  hometown: `You are a local newspaper beat reporter who has covered this program for years. You know every player by name — they are your neighbors, your community. Write with warmth and familiarity. Refer to the team as "our" or use the team name affectionately. Celebrate individual players by name like the whole town knows them. Find the human stories inside the stats. Your voice is familiar, proud, and slightly sentimental — the kind of column that gets cut out and stuck to a refrigerator. Write a 2-3 paragraph season recap. Do not use emojis.

END your response with exactly this format on its own line: TAGLINE: [three-word tagline]. The tagline must be EXACTLY 3 words — no more, no less. It should capture the essence of the season.`,

  legend: `You are an epic sports narrator documenting a legendary coaching dynasty for posterity. Treat this season as one chapter in a grander saga. The coach is a dynasty-builder whose decisions reshape the program's trajectory. Use metaphors about building empires, leaving legacies, and cementing greatness. Every win is a stone laid in a monument; every loss is a test of character that forged something stronger. Your voice is sweeping, grandiose, and cinematic — the energy of a video game's dynasty mode cinematic cutscene. Write a 2-3 paragraph season recap. Do not use emojis.

END your response with exactly this format on its own line: TAGLINE: [three-word tagline]. The tagline must be EXACTLY 3 words — no more, no less. It should capture the essence of the season.`,
};

// ── Context Aggregation ───────────────────────────────────────────────────────

async function buildNarrativeContext(
  dynasty: Dynasty,
  season: Season
): Promise<NarrativeContext> {
  // Fetch games for this season
  const games = await getGamesBySeason(season.id);

  // Build formatted game-by-game log string
  const gameLogLines = games.map((g) => {
    const rankStr = g.teamRanking ? `#${g.teamRanking} ` : '';
    const oppRankStr = g.opponentRanking ? `vs #${g.opponentRanking} ` : '';
    const location = g.homeAway === 'home' ? 'HOME' : g.homeAway === 'away' ? 'AWAY' : 'NEUTRAL';
    const gameTypeLabel =
      g.gameType === 'bowl'
        ? ' [BOWL]'
        : g.gameType === 'playoff'
          ? ' [PLAYOFF]'
          : g.gameType === 'conference'
            ? ' [CONF]'
            : '';
    const ot = g.overtime ? ' (OT)' : '';
    return `Wk ${g.week}: ${rankStr}${dynasty.teamName} ${g.teamScore}-${g.opponentScore} ${oppRankStr}${g.opponent} (${location}${gameTypeLabel}) [${g.result}${ot}]`;
  });
  const gameLog =
    gameLogLines.length > 0 ? gameLogLines.join('\n') : 'No games recorded.';

  // Fetch player seasons and resolve player names
  const playerSeasons = await getPlayerSeasonsBySeason(season.id);

  // Build stat candidate list: for each playerSeason, collect all non-zero stats
  interface StatCandidate {
    name: string;
    statKey: string;
    value: number;
  }

  const statCandidates: StatCandidate[] = [];

  // Priority stat keys for display (in order of preference)
  const priorityStats = [
    'passingYards',
    'rushingYards',
    'receivingYards',
    'tackles',
    'sacks',
    'interceptions',
    'touchdowns',
    'passingTouchdowns',
    'rushingTouchdowns',
    'receivingTouchdowns',
  ];

  for (const ps of playerSeasons) {
    const player = await db.players.get(ps.playerId);
    if (!player) continue;
    const playerName = `${player.firstName} ${player.lastName}`;

    for (const statKey of priorityStats) {
      const value = ps.stats[statKey];
      if (value && value > 0) {
        statCandidates.push({ name: playerName, statKey, value });
      }
    }
  }

  // Sort by value descending, take top 5, deduplicate by player+statKey
  const seen = new Set<string>();
  const topStatLines: string[] = [];

  // Sort candidates by value descending
  statCandidates.sort((a, b) => b.value - a.value);

  for (const candidate of statCandidates) {
    const key = `${candidate.name}:${candidate.statKey}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const label = formatStatKey(candidate.statKey);
    const valStr =
      Number.isInteger(candidate.value)
        ? String(candidate.value)
        : candidate.value.toFixed(1);
    topStatLines.push(`${candidate.name}: ${valStr} ${label}`);

    if (topStatLines.length >= 5) break;
  }

  const topPlayers =
    topStatLines.length > 0 ? topStatLines.join('\n') : 'No individual stats recorded.';

  return { dynasty, season, gameLog, topPlayers };
}

// ── User Message Builder ──────────────────────────────────────────────────────

function buildUserMessage(ctx: NarrativeContext): string {
  const { dynasty, season, gameLog, topPlayers } = ctx;

  const record = `${season.wins}-${season.losses}`;
  const confRecord = `${season.confWins}-${season.confLosses}`;
  const rankingLine = season.finalRanking
    ? `Final ranking: #${season.finalRanking}`
    : 'Unranked at season end';
  const bowlLine =
    season.bowlGame
      ? `Bowl/postseason game: ${season.bowlGame} — ${season.bowlResult === 'W' ? 'WIN' : season.bowlResult === 'L' ? 'LOSS' : 'Result unknown'}`
      : 'No bowl or postseason game.';
  const playoffLine = season.playoffResult
    ? `Playoff result: ${season.playoffResult}`
    : '';

  return [
    `Team: ${dynasty.teamName}`,
    `Coach: ${dynasty.coachName}`,
    `Sport: ${dynasty.sport === 'cfb' ? 'College Football' : 'Madden NFL'}`,
    `Season year: ${season.year}`,
    `Overall record: ${record}`,
    `Conference record: ${confRecord}`,
    rankingLine,
    bowlLine,
    playoffLine,
    '',
    'Game log:',
    gameLog,
    '',
    'Top player performances:',
    topPlayers,
  ]
    .filter((line) => line !== undefined && !(line === '' && false))
    .join('\n')
    .trim();
}

// ── Cache Functions ───────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'dynasty-os-narrative-';

export function getCachedNarrative(seasonId: string): SeasonNarrative | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + seasonId);
    if (!raw) return null;
    return JSON.parse(raw) as SeasonNarrative;
  } catch {
    return null;
  }
}

export function clearCachedNarrative(seasonId: string): void {
  try {
    localStorage.removeItem(CACHE_KEY_PREFIX + seasonId);
  } catch {
    // Ignore storage errors
  }
}

// ── API Call ──────────────────────────────────────────────────────────────────

export async function generateSeasonNarrative(
  dynasty: Dynasty,
  season: Season,
  tone: NarrativeTone,
  forceRefresh?: boolean
): Promise<SeasonNarrative | null> {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedNarrative(season.id);
    if (cached) return cached;
  }

  // Require API key
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const ctx = await buildNarrativeContext(dynasty, season);
    const userMessage = buildUserMessage(ctx);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: TONE_SYSTEM_PROMPTS[tone],
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[NarrativeService] Claude API returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const rawText: string | undefined = data?.content?.[0]?.text;
    if (!rawText) {
      console.warn('[NarrativeService] Claude API response missing text content');
      return null;
    }

    // Parse tagline from response — expected format: "TAGLINE: Three Word Summary" on last line
    const lines = rawText.trim().split('\n');
    let tagline = '';
    let recapLines = lines;

    // Find the TAGLINE line (should be at the end) — search from end to front
    let taglineIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('TAGLINE:')) {
        taglineIndex = i;
        break;
      }
    }
    if (taglineIndex !== -1) {
      const taglineRaw = lines[taglineIndex].replace(/^TAGLINE:\s*/i, '').trim();
      const words = taglineRaw.split(/\s+/).filter(Boolean);
      if (words.length === 3) {
        tagline = taglineRaw;
      } else {
        // Fallback: use first 3 words of the tagline raw, or first 3 words of recap
        tagline = words.slice(0, 3).join(' ') || rawText.split(/\s+/).slice(0, 3).join(' ');
      }
      recapLines = lines.slice(0, taglineIndex);
    } else {
      // No TAGLINE line found — use first 3 words of response as fallback
      tagline = rawText.split(/\s+/).slice(0, 3).join(' ');
    }

    const recap = recapLines.join('\n').trim();

    const narrative: SeasonNarrative = {
      recap,
      tagline,
      tone,
      generatedAt: Date.now(),
    };

    // Cache the narrative
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + season.id, JSON.stringify(narrative));
    } catch {
      // Ignore storage errors — narrative is still returned
    }

    return narrative;
  } catch (err) {
    console.warn('[NarrativeService] API call failed:', err);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatStatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
