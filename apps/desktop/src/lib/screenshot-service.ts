import { getApiKey } from './legacy-card-service';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScreenType =
  | 'schedule'
  | 'player-stats'
  | 'recruiting'
  | 'depth-chart'
  | 'nfl-schedule'
  | 'nfl-player-stats'
  | 'nfl-depth-chart';

export const SCREEN_TYPE_LABELS: Record<ScreenType, string> = {
  'schedule': 'Schedule / Game Results',
  'player-stats': 'Player Stats',
  'recruiting': 'Recruiting Class',
  'depth-chart': 'Depth Chart',
  'nfl-schedule': 'Schedule / Game Results',
  'nfl-player-stats': 'Player Stats',
  'nfl-depth-chart': 'Depth Chart',
};

// ── Parsed Data Shapes ────────────────────────────────────────────────────────

export interface ScheduleParsedData {
  screenType: 'schedule';
  games: Array<{
    week?: number;
    opponent?: string;
    homeAway?: 'Home' | 'Away' | 'Neutral';
    teamScore?: number;
    opponentScore?: number;
    result?: 'W' | 'L';
    gameType?: string;
  }>;
}

export interface PlayerStatsParsedData {
  screenType: 'player-stats';
  players: Array<{
    name?: string;
    position?: string;
    stats: Record<string, number | string>;
  }>;
}

export interface RecruitingParsedData {
  screenType: 'recruiting';
  recruits: Array<{
    name?: string;
    position?: string;
    stars?: number;
    state?: string;
    nationalRank?: number;
  }>;
  classRank?: number;
  totalCommits?: number;
}

export interface DepthChartParsedData {
  screenType: 'depth-chart';
  entries: Array<{
    position?: string;
    playerName?: string;
    depth?: number;
  }>;
}

export interface NflScheduleParsedData {
  screenType: 'nfl-schedule';
  games: Array<{
    week?: number;
    opponent?: string;
    homeAway?: 'Home' | 'Away' | 'Neutral';
    teamScore?: number;
    opponentScore?: number;
    result?: 'W' | 'L';
    gameType?: string;
  }>;
}

export interface NflPlayerStatsParsedData {
  screenType: 'nfl-player-stats';
  players: Array<{
    name?: string;
    position?: string;
    stats: Record<string, number | string>;
  }>;
}

export interface NflDepthChartParsedData {
  screenType: 'nfl-depth-chart';
  entries: Array<{
    position?: string;
    playerName?: string;
    depth?: number;
  }>;
}

export type ParsedScreenData =
  | ScheduleParsedData
  | PlayerStatsParsedData
  | RecruitingParsedData
  | DepthChartParsedData
  | NflScheduleParsedData
  | NflPlayerStatsParsedData
  | NflDepthChartParsedData;

// ── Vision API Prompts ────────────────────────────────────────────────────────

const SCREEN_TYPE_PROMPTS: Record<ScreenType, string> = {
  schedule:
    'You are parsing a CFB 25 in-game schedule screen. Extract each visible game row: week number, opponent team name, home/away/neutral indicator, team score, opponent score, win/loss result, and game type (regular, conference, bowl, playoff). Team name context: {teamName} ({season} season). Return ONLY valid JSON matching: {"games": [{"week": number|null, "opponent": string|null, "homeAway": "Home"|"Away"|"Neutral"|null, "teamScore": number|null, "opponentScore": number|null, "result": "W"|"L"|null, "gameType": string|null}]}. Leave fields null if not visible. No explanation — JSON only.',

  'player-stats':
    'You are parsing a CFB 25 player statistics screen. Extract each visible player row: player name, position, and all visible stat values with their labels as keys. Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"players": [{"name": string|null, "position": string|null, "stats": {"statLabel": value}}]}. Use stat labels exactly as shown on screen (e.g. "YDS", "TD", "ATT"). Leave fields null if not visible. No explanation — JSON only.',

  recruiting:
    'You are parsing a CFB 25 recruiting class screen. Extract overall class rank, total commits count, and each visible recruit row: name, position, star rating (1-5), home state abbreviation, and national recruit rank. Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"classRank": number|null, "totalCommits": number|null, "recruits": [{"name": string|null, "position": string|null, "stars": number|null, "state": string|null, "nationalRank": number|null}]}. No explanation — JSON only.',

  'depth-chart':
    'You are parsing a CFB 25 depth chart screen. Extract each position and its starters/backups: position abbreviation, player name, and depth number (1=starter, 2=backup, etc.). Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"entries": [{"position": string|null, "playerName": string|null, "depth": number|null}]}. No explanation — JSON only.',

  'nfl-schedule':
    'You are parsing a {gameVersion} in-game schedule screen. Extract each visible game row: week number, opponent team name, home/away/neutral indicator, team score, opponent score, win/loss result, and game type (regular, playoff, exhibition). Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"games": [{"week": number|null, "opponent": string|null, "homeAway": "Home"|"Away"|"Neutral"|null, "teamScore": number|null, "opponentScore": number|null, "result": "W"|"L"|null, "gameType": string|null}]}. Leave fields null if not visible. No explanation — JSON only.',

  'nfl-player-stats':
    'You are parsing a {gameVersion} player statistics screen. Extract each visible player row: player name, position, and all visible stat values with their labels as keys. Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"players": [{"name": string|null, "position": string|null, "stats": {"statLabel": value}}]}. Use stat labels exactly as shown on screen (e.g. "YDS", "TD", "RTG", "SCK"). No explanation — JSON only.',

  'nfl-depth-chart':
    'You are parsing a {gameVersion} depth chart screen. Extract each position and its starters/backups: position abbreviation, player name, and depth number (1=starter, 2=backup, etc.). Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"entries": [{"position": string|null, "playerName": string|null, "depth": number|null}]}. No explanation — JSON only.',
};

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Calls the Claude Vision API to parse an in-game screenshot.
 * Returns a typed ParsedScreenData object on success, null on any failure.
 * Never throws — callers receive a recoverable null signal on error.
 *
 * @param screenType - Which CFB 25 screen is being parsed
 * @param imageBase64 - Raw base64-encoded image (no data URL prefix)
 * @param dynastyContext - Team name and season year for prompt context
 */
export async function parseScreenshot(
  screenType: ScreenType,
  imageBase64: string,
  dynastyContext: { teamName: string; season: string; gameVersion?: string }
): Promise<ParsedScreenData | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  // Strip data URL prefix if caller passes a data URL
  const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

  // Build the system prompt with dynasty context substituted
  const systemPrompt = SCREEN_TYPE_PROMPTS[screenType]
    .replace(/\{teamName\}/g, dynastyContext.teamName)
    .replace(/\{season\}/g, dynastyContext.season)
    .replace(/\{gameVersion\}/g, dynastyContext.gameVersion ?? 'NFL');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: 'Parse this screenshot.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(
        `[ScreenshotService] Claude API returned ${response.status}: ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    const rawText: string | undefined = data?.content?.[0]?.text;
    if (!rawText) {
      console.warn('[ScreenshotService] Claude API response missing text content');
      return null;
    }

    // Strip markdown code fences if present (model may wrap JSON in ```json ... ```)
    const jsonText = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    // Attach the screenType discriminant and cast to the appropriate shape
    return { ...parsed, screenType } as ParsedScreenData;
  } catch (err) {
    console.warn('[ScreenshotService] API call or JSON parse failed:', err);
    return null;
  }
}
