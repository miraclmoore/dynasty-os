export interface Achievement {
  id: string;             // dynastyId + '-' + achievementId (compound key for upsert)
  dynastyId: string;
  achievementId: string;  // e.g. 'wins-10', 'bowl-wins-5', 'championships-1'
  category: 'wins' | 'bowl-wins' | 'championships';
  label: string;          // e.g. 'First 10 Wins'
  description: string;    // e.g. 'Win 10 games in your coaching career'
  threshold: number;      // numeric milestone value
  unlockedAt: number;     // Date.now() timestamp
}

export const MILESTONE_DEFINITIONS = [
  // Wins
  { achievementId: 'wins-10', category: 'wins', label: 'First 10 Wins', description: 'Win 10 games in your career', threshold: 10 },
  { achievementId: 'wins-25', category: 'wins', label: '25 Wins', description: 'Win 25 games in your career', threshold: 25 },
  { achievementId: 'wins-50', category: 'wins', label: '50 Wins', description: 'Win 50 games in your career', threshold: 50 },
  { achievementId: 'wins-100', category: 'wins', label: 'Century Mark', description: 'Win 100 games in your career', threshold: 100 },
  { achievementId: 'wins-200', category: 'wins', label: '200 Wins', description: 'Win 200 games in your career', threshold: 200 },
  // Bowl wins
  { achievementId: 'bowl-wins-1', category: 'bowl-wins', label: 'First Bowl Win', description: 'Win your first bowl game', threshold: 1 },
  { achievementId: 'bowl-wins-5', category: 'bowl-wins', label: 'Bowl Champion x5', description: 'Win 5 bowl games', threshold: 5 },
  { achievementId: 'bowl-wins-10', category: 'bowl-wins', label: 'Bowl Champion x10', description: 'Win 10 bowl games', threshold: 10 },
  { achievementId: 'bowl-wins-25', category: 'bowl-wins', label: 'Bowl Legend', description: 'Win 25 bowl games', threshold: 25 },
  // Championships
  { achievementId: 'championships-1', category: 'championships', label: 'First Title', description: 'Win your first championship', threshold: 1 },
  { achievementId: 'championships-3', category: 'championships', label: 'Dynasty Emerging', description: 'Win 3 championships', threshold: 3 },
  { achievementId: 'championships-5', category: 'championships', label: 'Dynasty Builder', description: 'Win 5 championships', threshold: 5 },
  { achievementId: 'championships-10', category: 'championships', label: 'Legendary Dynasty', description: 'Win 10 championships', threshold: 10 },
] as const;
