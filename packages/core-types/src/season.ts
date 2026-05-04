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
  // v2.2 (Phase 21 DMOD-02): bowl/playoff opponent + free-form key events list (rendered on ProgramTimelinePage)
  bowlOpponent?: string;
  keyEvents?: string[];
  createdAt: number;
  updatedAt: number;
}
