export interface TransferPortalEntry {
  id: string;
  dynastyId: string;
  seasonId: string;
  year: number;
  type: 'arrival' | 'departure';
  playerName: string;
  position: string;
  stars?: number;              // arrival only
  originSchool?: string;       // arrival only
  destinationSchool?: string;  // departure only
  createdAt: number;
  updatedAt: number;
}
