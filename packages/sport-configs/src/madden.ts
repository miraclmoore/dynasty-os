import type { SportConfig, TeamInfo, Conference, StatCategory } from '@dynasty-os/core-types';

const teams: TeamInfo[] = [
  // AFC East
  { name: 'Buffalo Bills', abbreviation: 'BUF', conference: 'AFC East', mascot: 'Bills' },
  { name: 'Miami Dolphins', abbreviation: 'MIA', conference: 'AFC East', mascot: 'Dolphins' },
  { name: 'New England Patriots', abbreviation: 'NE', conference: 'AFC East', mascot: 'Patriots' },
  { name: 'New York Jets', abbreviation: 'NYJ', conference: 'AFC East', mascot: 'Jets' },
  // AFC North
  { name: 'Baltimore Ravens', abbreviation: 'BAL', conference: 'AFC North', mascot: 'Ravens' },
  { name: 'Cincinnati Bengals', abbreviation: 'CIN', conference: 'AFC North', mascot: 'Bengals' },
  { name: 'Cleveland Browns', abbreviation: 'CLE', conference: 'AFC North', mascot: 'Browns' },
  { name: 'Pittsburgh Steelers', abbreviation: 'PIT', conference: 'AFC North', mascot: 'Steelers' },
  // AFC South
  { name: 'Houston Texans', abbreviation: 'HOU', conference: 'AFC South', mascot: 'Texans' },
  { name: 'Indianapolis Colts', abbreviation: 'IND', conference: 'AFC South', mascot: 'Colts' },
  { name: 'Jacksonville Jaguars', abbreviation: 'JAX', conference: 'AFC South', mascot: 'Jaguars' },
  { name: 'Tennessee Titans', abbreviation: 'TEN', conference: 'AFC South', mascot: 'Titans' },
  // AFC West
  { name: 'Denver Broncos', abbreviation: 'DEN', conference: 'AFC West', mascot: 'Broncos' },
  { name: 'Kansas City Chiefs', abbreviation: 'KC', conference: 'AFC West', mascot: 'Chiefs' },
  { name: 'Las Vegas Raiders', abbreviation: 'LV', conference: 'AFC West', mascot: 'Raiders' },
  { name: 'Los Angeles Chargers', abbreviation: 'LAC', conference: 'AFC West', mascot: 'Chargers' },
  // NFC East
  { name: 'Dallas Cowboys', abbreviation: 'DAL', conference: 'NFC East', mascot: 'Cowboys' },
  { name: 'New York Giants', abbreviation: 'NYG', conference: 'NFC East', mascot: 'Giants' },
  { name: 'Philadelphia Eagles', abbreviation: 'PHI', conference: 'NFC East', mascot: 'Eagles' },
  { name: 'Washington Commanders', abbreviation: 'WAS', conference: 'NFC East', mascot: 'Commanders' },
  // NFC North
  { name: 'Chicago Bears', abbreviation: 'CHI', conference: 'NFC North', mascot: 'Bears' },
  { name: 'Detroit Lions', abbreviation: 'DET', conference: 'NFC North', mascot: 'Lions' },
  { name: 'Green Bay Packers', abbreviation: 'GB', conference: 'NFC North', mascot: 'Packers' },
  { name: 'Minnesota Vikings', abbreviation: 'MIN', conference: 'NFC North', mascot: 'Vikings' },
  // NFC South
  { name: 'Atlanta Falcons', abbreviation: 'ATL', conference: 'NFC South', mascot: 'Falcons' },
  { name: 'Carolina Panthers', abbreviation: 'CAR', conference: 'NFC South', mascot: 'Panthers' },
  { name: 'New Orleans Saints', abbreviation: 'NO', conference: 'NFC South', mascot: 'Saints' },
  { name: 'Tampa Bay Buccaneers', abbreviation: 'TB', conference: 'NFC South', mascot: 'Buccaneers' },
  // NFC West
  { name: 'Arizona Cardinals', abbreviation: 'ARI', conference: 'NFC West', mascot: 'Cardinals' },
  { name: 'Los Angeles Rams', abbreviation: 'LAR', conference: 'NFC West', mascot: 'Rams' },
  { name: 'San Francisco 49ers', abbreviation: 'SF', conference: 'NFC West', mascot: '49ers' },
  { name: 'Seattle Seahawks', abbreviation: 'SEA', conference: 'NFC West', mascot: 'Seahawks' },
];

const conferences: Conference[] = [
  { name: 'AFC East', teams: ['Buffalo Bills', 'Miami Dolphins', 'New England Patriots', 'New York Jets'] },
  { name: 'AFC North', teams: ['Baltimore Ravens', 'Cincinnati Bengals', 'Cleveland Browns', 'Pittsburgh Steelers'] },
  { name: 'AFC South', teams: ['Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Tennessee Titans'] },
  { name: 'AFC West', teams: ['Denver Broncos', 'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers'] },
  { name: 'NFC East', teams: ['Dallas Cowboys', 'New York Giants', 'Philadelphia Eagles', 'Washington Commanders'] },
  { name: 'NFC North', teams: ['Chicago Bears', 'Detroit Lions', 'Green Bay Packers', 'Minnesota Vikings'] },
  { name: 'NFC South', teams: ['Atlanta Falcons', 'Carolina Panthers', 'New Orleans Saints', 'Tampa Bay Buccaneers'] },
  { name: 'NFC West', teams: ['Arizona Cardinals', 'Los Angeles Rams', 'San Francisco 49ers', 'Seattle Seahawks'] },
];

const statCategories: StatCategory[] = [
  // Passing
  { key: 'passingYards', label: 'Passing Yards', group: 'Passing', type: 'integer' },
  { key: 'passingTDs', label: 'Passing TDs', group: 'Passing', type: 'integer' },
  { key: 'interceptions', label: 'Interceptions', group: 'Passing', type: 'integer' },
  { key: 'completions', label: 'Completions', group: 'Passing', type: 'integer' },
  { key: 'attempts', label: 'Attempts', group: 'Passing', type: 'integer' },
  { key: 'passerRating', label: 'Passer Rating', group: 'Passing', type: 'decimal' },
  // Rushing
  { key: 'rushingYards', label: 'Rushing Yards', group: 'Rushing', type: 'integer' },
  { key: 'rushingTDs', label: 'Rushing TDs', group: 'Rushing', type: 'integer' },
  { key: 'rushingAttempts', label: 'Rushing Attempts', group: 'Rushing', type: 'integer' },
  // Receiving
  { key: 'receivingYards', label: 'Receiving Yards', group: 'Receiving', type: 'integer' },
  { key: 'receivingTDs', label: 'Receiving TDs', group: 'Receiving', type: 'integer' },
  { key: 'receptions', label: 'Receptions', group: 'Receiving', type: 'integer' },
  // Defense
  { key: 'tackles', label: 'Tackles', group: 'Defense', type: 'integer' },
  { key: 'sacks', label: 'Sacks', group: 'Defense', type: 'decimal' },
  { key: 'defenseInterceptions', label: 'Interceptions', group: 'Defense', type: 'integer' },
  { key: 'forcedFumbles', label: 'Forced Fumbles', group: 'Defense', type: 'integer' },
  { key: 'passDeflections', label: 'Pass Deflections', group: 'Defense', type: 'integer' },
  // Special Teams
  { key: 'fgMade', label: 'FG Made', group: 'Special Teams', type: 'integer' },
  { key: 'fgAttempted', label: 'FG Attempted', group: 'Special Teams', type: 'integer' },
  { key: 'punts', label: 'Punts', group: 'Special Teams', type: 'integer' },
  { key: 'puntAverage', label: 'Punt Average', group: 'Special Teams', type: 'decimal' },
  // General
  { key: 'gamesPlayed', label: 'Games Played', group: 'General', type: 'integer' },
];

export const maddenConfig: SportConfig = {
  sport: 'madden',
  label: 'Madden NFL',
  teams,
  conferences,
  positions: ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P'],
  statCategories,
  gameTypes: ['regular', 'playoff', 'exhibition'],
  gameVersions: ['Madden NFL 25', 'Madden NFL 26'],
};
