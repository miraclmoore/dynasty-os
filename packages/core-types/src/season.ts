export interface Season {
  id: string;
  dynastyId: string;
  year: number;
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  finalRanking?: number;
  bowlGame?: string;
  bowlResult?: 'W' | 'L';
  playoffResult?: string;
  tagline?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
