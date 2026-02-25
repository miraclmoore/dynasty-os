export interface FutureGame {
  id: string;
  dynastyId: string;
  year: number;
  week?: number;
  opponent: string;
  isHome?: boolean;
  gameType?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
