import { db } from '@dynasty-os/db';

export interface TimelineNode {
  seasonId: string;
  year: number;
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  finalRanking: number | null;
  bowlGame: string | null;
  bowlResult: 'W' | 'L' | null;
  bowlOpponent: string | null;
  tagline: string | null;
  keyEvents: string[];
}

export async function getTimelineNodes(dynastyId: string): Promise<TimelineNode[]> {
  const seasons = await db.seasons.where('dynastyId').equals(dynastyId).toArray();

  // Sort oldest first
  seasons.sort((a, b) => a.year - b.year);

  return seasons.map((season) => {
    let tagline: string | null = null;
    try {
      const raw = localStorage.getItem(`dynasty-os-narrative-${season.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        tagline = parsed?.tagline ?? null;
      }
    } catch {
      tagline = null;
    }

    return {
      seasonId: season.id,
      year: season.year,
      wins: season.wins,
      losses: season.losses,
      confWins: season.confWins,
      confLosses: season.confLosses,
      finalRanking: season.finalRanking ?? null,
      bowlGame: season.bowlGame ?? null,
      bowlResult: season.bowlResult ?? null,
      bowlOpponent: (season as any).bowlOpponent ?? null,
      tagline,
      keyEvents: (season as any).keyEvents ?? [],
    };
  });
}
