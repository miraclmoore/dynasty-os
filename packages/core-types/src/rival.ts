export interface Rival {
  id: string;
  dynastyId: string;
  opponent: string;       // Exact opponent name as it appears in game log
  label: string;          // Custom rivalry label (e.g., "The Iron Bowl", "The Border War")
  createdAt: number;
  updatedAt: number;
}
