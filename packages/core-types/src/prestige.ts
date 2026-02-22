export interface PrestigeRating {
  id: string;
  dynastyId: string;
  year: number;
  rating: number;            // 1-100
  recruitingRank?: number;   // for overlay on chart
  createdAt: number;
  updatedAt: number;
}
