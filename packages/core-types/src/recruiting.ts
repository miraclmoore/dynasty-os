export interface RecruitingClass {
  id: string;
  dynastyId: string;
  seasonId: string;
  year: number;
  classRank: number;
  totalCommits: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  aiGrade?: string;       // e.g. "A-", nullable until generated
  aiAnalysis?: string;    // 2-3 sentence analysis, nullable
  aiGeneratedAt?: number; // timestamp
  createdAt: number;
  updatedAt: number;
}

export interface Recruit {
  id: string;
  dynastyId: string;
  classId: string;         // FK to RecruitingClass
  name: string;
  position: string;
  stars: number;           // 1-5
  state?: string;
  nationalRank?: number;
  // v2.2 (Phase 21 DMOD-05): three motivation grades + deal breaker motivation + visit week (1-14)
  motivation1?: string;
  motivation2?: string;
  motivation3?: string;
  dealBreakerMotivation?: string;
  visitWeek?: number;
  createdAt: number;
  updatedAt: number;
}
