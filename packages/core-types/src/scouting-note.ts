export interface ScoutingNote {
  id: string;
  dynastyId: string;
  opponent: string;      // Unique per dynastyId — one note per opponent
  tendencies: string;    // Freeform text
  createdAt: number;
  updatedAt: number;
}
