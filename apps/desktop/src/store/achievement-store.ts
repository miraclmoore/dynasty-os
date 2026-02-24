import { create } from 'zustand';
import type { Achievement } from '@dynasty-os/core-types';
import { getAchievementsByDynasty } from '../lib/achievement-service';

interface AchievementState {
  achievements: Achievement[];
  loading: boolean;
  error: string | null;
}

interface AchievementActions {
  loadAchievements: (dynastyId: string) => Promise<void>;
}

type AchievementStore = AchievementState & AchievementActions;

export const useAchievementStore = create<AchievementStore>((set) => ({
  achievements: [],
  loading: false,
  error: null,

  loadAchievements: async (dynastyId: string) => {
    set({ loading: true, error: null });
    try {
      const achievements = await getAchievementsByDynasty(dynastyId);
      // Sort by unlockedAt descending (most recently unlocked first)
      achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
      set({ achievements, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
