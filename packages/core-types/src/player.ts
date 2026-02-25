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
