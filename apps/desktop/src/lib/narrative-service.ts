import { db } from '@dynasty-os/db';
import type { Dynasty, Season, Game } from '@dynasty-os/core-types';
import { getSportConfig } from '@dynasty-os/sport-configs';
import { getApiKey } from './legacy-card-service';
import { getGamesBySeason } from './game-service';
import { getPlayerSeasonsBySeason } from './player-season-service';
import { getAiCache, setAiCache, deleteAiCache } from './ai-cache-service';

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
  conference: string;
}

// ── System Prompt Builder ─────────────────────────────────────────────────────

const OUTPUT_INSTRUCTION_SEASON = `Write a 2-3 paragraph season recap. Do not use emojis.

END your response with exactly this format on its own line: TAGLINE: [three-word tagline]. The tagline must be EXACTLY 3 words — no more, no less. It should capture the essence of the season.`;

const OUTPUT_INSTRUCTION_GAME = `Write a 1-paragraph post-game recap (4–6 sentences). Do not use emojis.

END your response with exactly this format on its own line: TAGLINE: [three-word tagline]. The tagline must be EXACTLY 3 words — no more, no less. It should capture the essence of this game.`;

function buildDataConstraintBlock(dynasty: Dynasty): string {
  const sportVocab =
    dynasty.sport === 'cfb'
      ? 'CFB vocabulary: bowl game, conference championship, College Football Playoff, national ranking, recruiting class'
      : 'NFL vocabulary: playoffs, Super Bowl, division title, NFL Draft, roster depth';

  return `CRITICAL DATA RULES:
- Use the team name "${dynasty.teamName}" EXACTLY — never alter, abbreviate, or substitute it.
- Write ONLY from the data provided. Do not invent games, scores, opponents, player names, or history.
- If a stat or event is not in the data below, do not reference it.
- ${sportVocab}`;
}

const TONE_PERSONAS: Record<NarrativeTone, (dynasty: Dynasty) => string> = {
  espn: (dynasty) => {
    if (dynasty.sport === 'cfb') {
      return `You are a national college football broadcaster in the style of Chris Fowler working alongside a Kirk Herbstreit-style analyst. Write conversationally and with precision — no catchphrases, no self-promotion. You document what happened, stay out of the way when the story is good, and add expert context when it adds value. Use active voice. Name specific stats only from the data provided. Tie the record to its conference and national significance. End with what this season means for the program's trajectory (bowl prestige, recruiting perception, conference standing).`;
    }
    return `You are writing in the style of Scott Van Pelt's SportsCenter segment — elevated vocabulary, personal perspective, clear celebration of standout performances. Your voice has weight and wit. Anchor the recap in the most compelling stat or moment from the season. Put the record in division and playoff context. Name the standout performer with their numbers. Close with what the season means for the franchise: is the window open, closing, or still being built?`;
  },
  hometown: () =>
    `You are a local sports columnist who has covered this program for 10+ years. You know the players, the town knows you, and your column is the one people read with their morning coffee. Write in first-person plural occasionally ('we', 'our guys') but mostly with the warmth of someone who genuinely cares. Celebrate individual players by first name like the whole community knows them. Find the human angle inside the stats — the sophomore who stepped up, the senior's final season, the comeback win that had everyone on their feet. Your prose is accessible, a little sentimental, and honest even about the losses. This is the column that gets pinned to the locker room bulletin board.`,
  legend: () =>
    `You are writing narration for a sports documentary in the style of NFL Films or ESPN's 30 for 30 series — cinematic, weighty, built for posterity. Every season is a chapter in a larger story. Your sentences have rhythm and consequence. Reference what was at stake, what was risked, what was proven. Use the specific data provided to ground the drama in real events. Avoid generic hyperbole — the specifics are what make it feel real. Close with a line that sounds like it belongs on the last frame of a documentary: the kind of sentence a coach reads years later and feels something.`,
};

function buildSystemPrompt(tone: NarrativeTone, dynasty: Dynasty, isGame = false): string {
  const dataConstraint = buildDataConstraintBlock(dynasty);
  const persona = TONE_PERSONAS[tone](dynasty);
  const outputInstruction = isGame ? OUTPUT_INSTRUCTION_GAME : OUTPUT_INSTRUCTION_SEASON;

  return [dataConstraint, '', persona, '', outputInstruction].join('\n');
}

// ── Context Aggregation ───────────────────────────────────────────────────────

function resolveConference(dynasty: Dynasty): string {
  try {
    const config = getSportConfig(dynasty.sport);
    const team = config.teams.find((t) => t.name === dynasty.teamName);
    return team?.conference ?? '';
  } catch {
    return '';
  }
}

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

  const conference = resolveConference(dynasty);

  return { dynasty, season, gameLog, topPlayers, conference };
}

// ── User Message Builders ─────────────────────────────────────────────────────

function buildSeasonUserMessage(ctx: NarrativeContext): string {
  const { dynasty, season, gameLog, topPlayers, conference } = ctx;

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
    conference ? `Conference: ${conference}` : '',
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
    .filter((line) => line !== '')
    .join('\n')
    .trim();
}

function buildGameUserMessage(dynasty: Dynasty, season: Season, game: Game, conference: string): string {
  const location =
    game.homeAway === 'home' ? 'Home' : game.homeAway === 'away' ? 'Away' : 'Neutral site';
  const oppRanking = game.opponentRanking ? `#${game.opponentRanking} ` : '';
  const teamRanking = game.teamRanking ? `#${game.teamRanking} ` : '';
  const gameTypeLabels: Record<string, string> = {
    regular: 'Regular season',
    conference: 'Conference game',
    bowl: 'Bowl game',
    playoff: 'Playoff game',
    exhibition: 'Exhibition',
  };
  const overtimeLine = game.overtime ? 'Game went to overtime: Yes' : '';
  const notesLine = game.notes ? `Game notes: ${game.notes}` : '';

  return [
    `Team: ${dynasty.teamName}`,
    conference ? `Conference: ${conference}` : '',
    `Coach: ${dynasty.coachName}`,
    `Sport: ${dynasty.sport === 'cfb' ? 'College Football' : 'Madden NFL'}`,
    `Season year: ${season.year}`,
    `Week: ${game.week}`,
    `Opponent: ${oppRanking}${game.opponent}`,
    `Team ranking entering game: ${teamRanking || 'Unranked'}`,
    `Score: ${dynasty.teamName} ${game.teamScore}, ${game.opponent} ${game.opponentScore}`,
    `Result: ${game.result === 'W' ? 'WIN' : game.result === 'L' ? 'LOSS' : 'TIE'}`,
    `Location: ${location}`,
    `Game type: ${gameTypeLabels[game.gameType] ?? game.gameType}`,
    overtimeLine,
    notesLine,
  ]
    .filter((line) => line !== '')
    .join('\n')
    .trim();
}

// ── Cache Functions ───────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'dynasty-os-narrative-';
const GAME_CACHE_KEY_PREFIX = 'dynasty-os-game-narrative-';

export async function getCachedNarrative(
  dynastyId: string,
  seasonId: string,
  tone?: NarrativeTone
): Promise<SeasonNarrative | null> {
  try {
    const cacheKey = tone
      ? `${CACHE_KEY_PREFIX}${seasonId}-${tone}`
      : CACHE_KEY_PREFIX + seasonId;
    const raw = await getAiCache(dynastyId, cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as SeasonNarrative;
  } catch {
    return null;
  }
}

export async function clearCachedNarrative(
  dynastyId: string,
  seasonId: string,
  tone?: NarrativeTone
): Promise<void> {
  try {
    const cacheKey = tone
      ? `${CACHE_KEY_PREFIX}${seasonId}-${tone}`
      : CACHE_KEY_PREFIX + seasonId;
    await deleteAiCache(dynastyId, cacheKey);
  } catch {
    // Ignore storage errors
  }
}

export async function getCachedGameNarrative(
  dynastyId: string,
  gameId: string,
  tone: NarrativeTone
): Promise<SeasonNarrative | null> {
  try {
    const cacheKey = `${GAME_CACHE_KEY_PREFIX}${gameId}-${tone}`;
    const raw = await getAiCache(dynastyId, cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as SeasonNarrative;
  } catch {
    return null;
  }
}

// ── Shared API Call Helper ────────────────────────────────────────────────────

async function callClaudeApi(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
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

  return rawText;
}

function parseNarrativeResponse(rawText: string, tone: NarrativeTone): SeasonNarrative {
  const lines = rawText.trim().split('\n');
  let tagline = '';
  let recapLines = lines;

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
    tagline =
      words.length === 3
        ? taglineRaw
        : words.slice(0, 3).join(' ') || rawText.split(/\s+/).slice(0, 3).join(' ');
    recapLines = lines.slice(0, taglineIndex);
  } else {
    tagline = rawText.split(/\s+/).slice(0, 3).join(' ');
  }

  return {
    recap: recapLines.join('\n').trim(),
    tagline,
    tone,
    generatedAt: Date.now(),
  };
}

// ── Season Narrative ──────────────────────────────────────────────────────────

export async function generateSeasonNarrative(
  dynasty: Dynasty,
  season: Season,
  tone: NarrativeTone,
  forceRefresh?: boolean
): Promise<SeasonNarrative | null> {
  if (!forceRefresh) {
    const cached = await getCachedNarrative(dynasty.id, season.id, tone);
    if (cached) return cached;
  }

  if (!getApiKey()) return null;

  try {
    const ctx = await buildNarrativeContext(dynasty, season);
    const systemPrompt = buildSystemPrompt(tone, dynasty, false);
    const userMessage = buildSeasonUserMessage(ctx);

    const rawText = await callClaudeApi(systemPrompt, userMessage, 1000);
    if (!rawText) return null;

    const narrative = parseNarrativeResponse(rawText, tone);

    const cacheKey = `${CACHE_KEY_PREFIX}${season.id}-${tone}`;
    await setAiCache(dynasty.id, cacheKey, 'season-narrative', JSON.stringify(narrative));

    return narrative;
  } catch (err) {
    console.warn('[NarrativeService] API call failed:', err);
    return null;
  }
}

// ── Game Narrative ────────────────────────────────────────────────────────────

export async function generateGameNarrative(
  dynasty: Dynasty,
  season: Season,
  game: Game,
  tone: NarrativeTone,
  forceRefresh?: boolean
): Promise<SeasonNarrative | null> {
  if (!forceRefresh) {
    const cached = await getCachedGameNarrative(dynasty.id, game.id, tone);
    if (cached) return cached;
  }

  if (!getApiKey()) return null;

  try {
    const conference = resolveConference(dynasty);
    const systemPrompt = buildSystemPrompt(tone, dynasty, true);
    const userMessage = buildGameUserMessage(dynasty, season, game, conference);

    const rawText = await callClaudeApi(systemPrompt, userMessage, 400);
    if (!rawText) return null;

    const narrative = parseNarrativeResponse(rawText, tone);

    const cacheKey = `${GAME_CACHE_KEY_PREFIX}${game.id}-${tone}`;
    await setAiCache(dynasty.id, cacheKey, 'game-narrative', JSON.stringify(narrative));

    return narrative;
  } catch (err) {
    console.warn('[NarrativeService] game API call failed:', err);
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
