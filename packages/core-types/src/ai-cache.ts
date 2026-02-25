export type AiContentType = 'legacy-blurb' | 'season-narrative' | 'recruiting-grade' | 'journalist-blurb' | 'hot-seat' | 'dossier' | 'rival-prophecy' | 'obituary' | 'generational-arc' | 'what-if' | 'dna-report' | 'living-chronicle';

export interface AiCacheEntry {
  id: string;
  dynastyId: string;
  cacheKey: string;
  contentType: AiContentType;
  content: string;
  createdAt: number;
  updatedAt: number;
}
