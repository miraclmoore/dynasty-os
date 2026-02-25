export interface PlayerLink {
  id: string;
  dynastyId: string;
  playerId: string;
  linkedDynastyId: string;
  linkedPlayerId: string;
  linkType: 'cfb-to-nfl' | 'nfl-to-cfb' | 'cross-dynasty';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
