export type GameType = 'regular' | 'conference' | 'bowl' | 'playoff' | 'exhibition';
export type GameResult = 'W' | 'L' | 'T';
export type HomeAway = 'home' | 'away' | 'neutral';

export interface Game {
  id: string;
  seasonId: string;
  dynastyId: string;
  week: number;
  opponent: string;
  opponentRanking?: number;
  teamScore: number;
  opponentScore: number;
  result: GameResult;
  homeAway: HomeAway;
  gameType: GameType;
  overtime: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
