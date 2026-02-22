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
  createdAt: number;
  updatedAt: number;
}
