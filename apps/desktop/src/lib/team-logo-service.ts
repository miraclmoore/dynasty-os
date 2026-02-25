import type { SportType } from '@dynasty-os/core-types';
import { CFB_ESPN_IDS } from './cfb-espn-ids';

// ESPN CDN abbreviations for NFL teams.
// These differ from our madden/nfl2k config abbreviations in a few cases.
const NFL_ESPN_ABBREVS: Record<string, string> = {
  'Arizona Cardinals': 'ari',
  'Atlanta Falcons': 'atl',
  'Baltimore Ravens': 'bal',
  'Buffalo Bills': 'buf',
  'Carolina Panthers': 'car',
  'Chicago Bears': 'chi',
  'Cincinnati Bengals': 'cin',
  'Cleveland Browns': 'cle',
  'Dallas Cowboys': 'dal',
  'Denver Broncos': 'den',
  'Detroit Lions': 'det',
  'Green Bay Packers': 'gb',
  'Houston Texans': 'hou',
  'Indianapolis Colts': 'ind',
  'Jacksonville Jaguars': 'jax',
  'Kansas City Chiefs': 'kc',
  'Las Vegas Raiders': 'lv',
  'Los Angeles Chargers': 'lac',
  'Los Angeles Rams': 'lar',
  'Miami Dolphins': 'mia',
  'Minnesota Vikings': 'min',
  'New England Patriots': 'ne',
  'New Orleans Saints': 'no',
  'New York Giants': 'nyg',
  'New York Jets': 'nyj',
  'Philadelphia Eagles': 'phi',
  'Pittsburgh Steelers': 'pit',
  'San Francisco 49ers': 'sf',
  'Seattle Seahawks': 'sea',
  'Tampa Bay Buccaneers': 'tb',
  'Tennessee Titans': 'ten',
  'Washington Commanders': 'was',
};

/**
 * Returns the ESPN CDN logo URL for a team, or null for unrecognized names.
 * Uses onError fallback in the img tag to hide broken images.
 */
export function getTeamLogoUrl(teamName: string, sport: SportType): string | null {
  if (sport === 'cfb') {
    const id = CFB_ESPN_IDS[teamName];
    if (!id) return null;
    return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
  }

  // madden and nfl2k both use NFL logos
  const abbrev = NFL_ESPN_ABBREVS[teamName];
  if (!abbrev) return null;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbrev}.png`;
}
