export type SportType = 'cfb' | 'madden' | 'nfl2k';

export interface Dynasty {
  id: string;              // UUID
  name: string;            // e.g., "Texas Longhorns Dynasty"
  sport: SportType;
  teamName: string;        // e.g., "Texas Longhorns"
  coachName: string;
  startYear: number;       // e.g., 2024
  currentYear: number;     // tracks progression
  gameVersion: string;     // e.g., "EA Sports CFB 26", "Madden NFL 26"
  createdAt: number;       // timestamp
  updatedAt: number;       // timestamp
}
