// ── ESPN unofficial API endpoints (no key required) ───────────────────────────

const ESPN_NFL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_CFB = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TickerLeague = 'nfl' | 'ncaa';

export interface ScoreItem {
  id: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: string;
  homeScore: string;
  /** e.g. "Final", "Q3 4:22", "Halftime", "Pregame 1:00 PM ET" */
  statusText: string;
  isLive: boolean;
  isFinal: boolean;
  url?: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  url?: string;
}

export interface TickerData {
  scores: ScoreItem[];
  news: NewsItem[];
  fetchedAt: number;
  hasLiveGames: boolean;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

function base(league: TickerLeague) {
  return league === 'nfl' ? ESPN_NFL : ESPN_CFB;
}

export async function fetchScores(league: TickerLeague): Promise<ScoreItem[]> {
  try {
    const res = await fetch(`${base(league)}/scoreboard`);
    if (!res.ok) return [];
    const json = await res.json() as { events?: EspnEvent[] };
    return (json.events ?? []).map((e) => parseEvent(e, league)).filter(Boolean) as ScoreItem[];
  } catch {
    return [];
  }
}

export async function fetchNews(league: TickerLeague): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${base(league)}/news?limit=10`);
    if (!res.ok) return [];
    const json = await res.json() as { articles?: EspnArticle[] };
    return (json.articles ?? []).slice(0, 10).map((a, i) => ({
      id: String(i),
      headline: a.headline ?? '',
      url: a.links?.web?.href,
    })).filter((n) => n.headline);
  } catch {
    return [];
  }
}

export async function fetchTickerData(league: TickerLeague): Promise<TickerData> {
  const [scores, news] = await Promise.all([fetchScores(league), fetchNews(league)]);
  return {
    scores,
    news,
    fetchedAt: Date.now(),
    hasLiveGames: scores.some((s) => s.isLive),
  };
}

// ── ESPN response shapes ──────────────────────────────────────────────────────

interface EspnEvent {
  id?: string;
  status?: {
    type?: { description?: string; completed?: boolean; state?: string };
    displayClock?: string;
    period?: number;
  };
  competitions?: Array<{
    competitors?: Array<{
      team?: { abbreviation?: string };
      score?: string;
      homeAway?: string;
    }>;
  }>;
}

interface EspnArticle {
  headline?: string;
  links?: { web?: { href?: string } };
}

function parseEvent(event: EspnEvent, league: TickerLeague): ScoreItem | null {
  try {
    const comp = event.competitions?.[0];
    if (!comp?.competitors) return null;

    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) return null;

    const state = event.status?.type?.state ?? '';
    const description = event.status?.type?.description ?? '';
    const clock = event.status?.displayClock;
    const period = event.status?.period;
    const completed = event.status?.type?.completed ?? false;

    const isLive = state === 'in';
    const isFinal = completed || state === 'post';

    let statusText: string;
    if (isFinal) {
      statusText = 'Final';
    } else if (isLive) {
      const periodLabel = period && period <= 4 ? `Q${period}` : period ? `OT${period - 4}` : '';
      statusText = clock ? `${periodLabel} ${clock}`.trim() : description;
    } else {
      statusText = description || 'Scheduled';
    }

    const gameId = event.id;
    const url = gameId
      ? league === 'nfl'
        ? `https://www.espn.com/nfl/game/_/gameId/${gameId}`
        : `https://www.espn.com/college-football/game/_/gameId/${gameId}`
      : undefined;

    return {
      id: gameId ?? `${away.team?.abbreviation}-${home.team?.abbreviation}`,
      awayAbbr: away.team?.abbreviation ?? '???',
      homeAbbr: home.team?.abbreviation ?? '???',
      awayScore: away.score ?? '-',
      homeScore: home.score ?? '-',
      statusText,
      isLive,
      isFinal,
      url,
    };
  } catch {
    return null;
  }
}
