export interface DraftPick {
  id: string;
  dynastyId: string;
  seasonId: string;          // season player was drafted FROM
  year: number;
  playerId?: string;         // nullable FK to Player
  playerName: string;
  position: string;
  round: number;             // 1-7
  pickNumber?: number;
  nflTeam: string;
  createdAt: number;
  updatedAt: number;
}
