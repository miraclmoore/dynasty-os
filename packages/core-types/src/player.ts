export type PlayerStatus = 'active' | 'graduated' | 'transferred' | 'drafted' | 'injured' | 'other';

export interface Player {
  id: string;
  dynastyId: string;
  firstName: string;
  lastName: string;
  position: string;
  recruitingStars?: number;
  homeState?: string;
  homeCity?: string;
  height?: string;
  weight?: number;
  jerseyNumber?: number;
  classYear?: string;
  status: PlayerStatus;
  departureYear?: number;
  departureReason?: string;
  birthYear?: number;
  notes?: string;
  // v2.2 (Phase 21 DMOD-03): cross-sport development trait selector
  devTrait?: 'normal' | 'star' | 'superstar' | 'xfactor';
  // v2.2 (Phase 21 DMOD-04): CFB-only deal breaker (one of 14 CFB 26 categories) + redshirt flag
  dealBreaker?: string;
  isRedshirt?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerSeason {
  id: string;
  playerId: string;
  dynastyId: string;
  seasonId: string;
  year: number;
  stats: Record<string, number>;
  awards?: string[];
  overallRating?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
