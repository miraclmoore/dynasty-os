import type { SportConfig } from '@dynasty-os/core-types';
import { maddenTeams, maddenConferences, maddenStatCategories } from './madden';

export const nfl2kConfig: SportConfig = {
  sport: 'nfl2k',
  label: 'NFL 2K',
  teams: maddenTeams,
  conferences: maddenConferences,
  positions: ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P'],
  statCategories: maddenStatCategories,
  gameTypes: ['regular', 'playoff', 'exhibition'],
  gameVersions: [
    'NFL 4K24 (Mod)', 'NFL 2K25 (Mod)', 'NFL 2K5 Resurrected (Mod)',
    'ESPN NFL 2K5', 'ESPN NFL 2K4',
  ],
};
