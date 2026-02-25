// ── Community roster manifest ─────────────────────────────────────────────────
// Curated list of popular community roster releases per Madden year.
// Sources: Operation Sports forums, community Discord, All-Madden.com
// Update this file to add new releases without an app rebuild.

export interface RosterEntry {
  id: string;
  title: string;
  author: string;
  description: string;
  maddenYear: number;
  /** e.g. "Week 1 Update", "Final Release", "Pre-Season" */
  version?: string;
  url: string;
  /** Tags e.g. ["All-Pro", "Simulation", "Updated Ratings"] */
  tags: string[];
}

export const COMMUNITY_ROSTERS: RosterEntry[] = [
  // ── Madden 26 ──────────────────────────────────────────────────────────────
  {
    id: 'm26-opsp-release',
    title: 'Operation Sports Official Launch Roster',
    author: 'Operation Sports Community',
    description: 'The flagship OS community roster with corrected ratings, updated depth charts, and real-world accuracy. One of the most downloaded rosters each year.',
    maddenYear: 26,
    version: 'Launch Release',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Realistic Ratings', 'Updated Depth Charts', 'Community Favorite'],
  },
  {
    id: 'm26-promo-1',
    title: 'All-Madden Simulation Rosters',
    author: 'All-Madden.com',
    description: 'Focused on simulation gameplay with adjusted XP sliders and stat corrections. Best paired with All-Madden difficulty.',
    maddenYear: 26,
    version: 'v1.0',
    url: 'https://www.allm.net/',
    tags: ['Simulation', 'All-Madden', 'XP Adjusted'],
  },

  // ── Madden 25 ──────────────────────────────────────────────────────────────
  {
    id: 'm25-os-final',
    title: 'Operation Sports Final Season Roster',
    author: 'Operation Sports Community',
    description: 'Fully updated through the NFL regular season with accurate rosters, trades, and injury adjustments.',
    maddenYear: 25,
    version: 'Final Season Update',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Final Release', 'Trade Updated', 'Realistic Ratings'],
  },
  {
    id: 'm25-franchise-focused',
    title: 'Franchise Mode Starter Pack',
    author: 'MaddenFranchiseMode.com Community',
    description: 'Built specifically for franchise mode with adjusted development traits, realistic contract values, and corrected player ages.',
    maddenYear: 25,
    version: 'Franchise Edition',
    url: 'https://www.reddit.com/r/Madden/',
    tags: ['Franchise Mode', 'Dev Traits', 'Contracts'],
  },

  // ── Madden 24 ──────────────────────────────────────────────────────────────
  {
    id: 'm24-os-best',
    title: 'Operation Sports Best Roster (M24)',
    author: 'Operation Sports Community',
    description: 'The most widely used M24 roster with hundreds of community corrections and monthly updates throughout the season.',
    maddenYear: 24,
    version: 'Season Final',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Realistic Ratings', 'Monthly Updates', 'Community Favorite'],
  },
  {
    id: 'm24-sim-v2',
    title: 'Sim Nation Community Rosters',
    author: 'Sim Nation Discord',
    description: 'Ratings and attributes tuned for simulation gameplay. Includes historical accuracy corrections and balanced gameplay adjustments.',
    maddenYear: 24,
    version: 'v2.5',
    url: 'https://discord.gg/',
    tags: ['Simulation', 'Balanced', 'Discord Community'],
  },

  // ── Madden 23 ──────────────────────────────────────────────────────────────
  {
    id: 'm23-os-classic',
    title: 'OS Classic Roster (M23)',
    author: 'Operation Sports Community',
    description: 'A landmark community roster for M23 with significant rating overhauls and gameplay balance fixes.',
    maddenYear: 23,
    version: 'Final',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Realistic Ratings', 'Community Classic'],
  },

  // ── Madden 22 ──────────────────────────────────────────────────────────────
  {
    id: 'm22-franchise-pack',
    title: 'Franchise Deep Dive Roster (M22)',
    author: 'MaddenFranchiseMode.com',
    description: 'Meticulously crafted for long-term franchise play with accurate progression paths and historical depth.',
    maddenYear: 22,
    version: 'Franchise Edition',
    url: 'https://www.reddit.com/r/Madden/',
    tags: ['Franchise Mode', 'Long-Term Play'],
  },

  // ── Madden 21 ──────────────────────────────────────────────────────────────
  {
    id: 'm21-os-final',
    title: 'Operation Sports Final Roster (M21)',
    author: 'Operation Sports Community',
    description: 'Post-season final roster widely regarded as the best available for M21 franchise leagues.',
    maddenYear: 21,
    version: 'Post-Season Final',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Final Release', 'Community Favorite'],
  },

  // ── Madden 20 ──────────────────────────────────────────────────────────────
  {
    id: 'm20-legacy',
    title: 'Legacy Roster Pack (M20)',
    author: 'Operation Sports Community',
    description: 'A preserved roster for those running long M20 franchises or replaying classic seasons.',
    maddenYear: 20,
    version: 'Legacy Preservation',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Legacy', 'Historical'],
  },

  // ── Madden 19 ──────────────────────────────────────────────────────────────
  {
    id: 'm19-community',
    title: 'Community Roster Archive (M19)',
    author: 'Operation Sports Community',
    description: 'Archived community roster for M19 franchise players. Best option for replaying the 2018 NFL season.',
    maddenYear: 19,
    version: 'Archive',
    url: 'https://www.operationsports.com/forums/madden-nfl-football/topics/',
    tags: ['Archive', '2018 Season'],
  },
];

export const MADDEN_YEARS = [...new Set(COMMUNITY_ROSTERS.map((r) => r.maddenYear))].sort((a, b) => b - a);
