import { create } from 'zustand';
import type { SeasonNarrative, NarrativeTone } from '../lib/narrative-service';
import { generateSeasonNarrative, getCachedNarrative } from '../lib/narrative-service';
import type { Dynasty, Season } from '@dynasty-os/core-types';

interface NarrativeState {
  narrative: SeasonNarrative | null;
  loading: boolean;
  error: string | null;
}

interface NarrativeActions {
  loadCachedNarrative: (seasonId: string) => void;
  generate: (dynasty: Dynasty, season: Season, tone: NarrativeTone, forceRefresh?: boolean) => Promise<void>;
  clear: () => void;
}

type NarrativeStore = NarrativeState & NarrativeActions;

export const useNarrativeStore = create<NarrativeStore>((set) => ({
  narrative: null,
  loading: false,
  error: null,

  loadCachedNarrative: (seasonId: string) => {
    const cached = getCachedNarrative(seasonId);
    set({ narrative: cached });
  },

  generate: async (dynasty: Dynasty, season: Season, tone: NarrativeTone, forceRefresh?: boolean) => {
    set({ loading: true, error: null });
    try {
      const narrative = await generateSeasonNarrative(dynasty, season, tone, forceRefresh);
      if (narrative === null) {
        set({
          loading: false,
          error: 'Could not generate narrative. Check that your Anthropic API key is configured.',
        });
      } else {
        set({ narrative, loading: false });
      }
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  clear: () => {
    set({ narrative: null, loading: false, error: null });
  },
}));
