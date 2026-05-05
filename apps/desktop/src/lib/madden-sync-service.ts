import { Command } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { db } from '@dynasty-os/db';
import { createGame, getGamesBySeason } from './game-service';
import { createPlayer, getPlayersByDynasty } from './player-service';
import { createPlayerSeason, getPlayerSeasonsByDynasty, updatePlayerSeason } from './player-season-service';
import { createDraftPick, getDraftPicksBySeason } from './draft-service';
import type { GameResult, HomeAway, GameType } from '@dynasty-os/core-types';
import {
  getMaddenSavePath,
  setMaddenSavePath as prefSetSavePath,
  clearMaddenSavePath as prefClearSavePath,
  getMaddenWatcherEnabled,
  setMaddenWatcherEnabled as prefSetWatcher,
} from './prefs-service';

// ── SIDECAR KEY ───────────────────────────────────────────────────────────────

const SIDECAR = 'binaries/madden-reader';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidateResult {
  valid: boolean;
  gameYear: number | null;
  yearShort: number | null;
  supported: boolean;
  unsupportedReason: string | null;
  error?: string;
  message?: string;
}

export interface RawGame {
  week: number | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  gameType: string | null;
}

export interface RawPlayer {
  name: string | null;
  position: string | null;
  overall: number | null;
  age: number | null;
  jerseyNumber: number | null;
}

export interface RawDraftPick {
  round: number | null;
  pick: number | null;
  team: string | null;
}

export interface RawPlayerStat {
  playerName: string | null;
  playerIndex: number | null;
  passYards: number | null;
  passTD: number | null;
  interceptions: number | null;
  rushYards: number | null;
  rushTD: number | null;
  recYards: number | null;
  recTD: number | null;
  receptions: number | null;
  sacks: number | null;
  tackles: number | null;
}

export interface ExtractResult {
  gameYear: number | null;
  games: RawGame[];
  players: RawPlayer[];
  draftPicks: RawDraftPick[];
  playerStats: RawPlayerStat[];
  error?: string;
  message?: string;
}

/** A game entry that has been resolved to Dynasty OS's data model */
export interface MappedGame {
  week: number;
  opponent: string;
  homeAway: HomeAway;
  teamScore: number;
  opponentScore: number;
  result: GameResult;
  gameType: GameType;
}

export interface PackageVersionInfo {
  installed: string | null;
  latest: string | null;
  updateAvailable: boolean;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  version?: string;
  error?: string;
}

/** Confirmation diff shown before committing */
export interface SyncDiff {
  gamesToAdd: MappedGame[];
  gamesSkipped: number; // already exist in DB (by week)
  playersToAdd: RawPlayer[];
  playersSkipped: number;
  draftPicksToAdd: RawDraftPick[];
  draftPicksSkipped: number;
  playerStats: RawPlayerStat[];
  gameYear: number | null;
}

// ── Save file path storage (D-10: now backed by prefs-service plugin-store) ──

export async function getStoredSavePath(): Promise<string | null> {
  return getMaddenSavePath();
}

export async function storeSavePath(path: string): Promise<void> {
  await prefSetSavePath(path);
}

export async function clearSavePath(): Promise<void> {
  await prefClearSavePath();
}

export async function isWatcherEnabled(): Promise<boolean> {
  return getMaddenWatcherEnabled();
}

export async function setWatcherEnabled(enabled: boolean): Promise<void> {
  await prefSetWatcher(enabled);
}

// ── File picker ───────────────────────────────────────────────────────────────

/** Open the OS file dialog filtered to .frs files. Returns path or null. */
export async function pickSaveFile(): Promise<string | null> {
  const selected = await openDialog({
    title: 'Select Madden Franchise Save File',
    filters: [{ name: 'Madden Franchise Save', extensions: ['frs'] }],
    multiple: false,
    directory: false,
  });
  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

// ── Sidecar invocation ────────────────────────────────────────────────────────

/** Run the sidecar and collect stdout as a JSON string. Never throws. */
async function runSidecar(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    let output = '';
    const command = Command.sidecar(SIDECAR, args);
    command.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    command.on('close', () => resolve(output));
    command.on('error', (err) => {
      resolve(JSON.stringify({ error: 'sidecar_error', message: String(err) }));
    });
    command.spawn().catch((err) => {
      resolve(JSON.stringify({ error: 'spawn_error', message: String(err) }));
    });
  });
}

// ── Validate ──────────────────────────────────────────────────────────────────

/**
 * Validates a Madden .frs save file.
 * Returns ValidateResult. Never throws.
 */
export async function validateSaveFile(filePath: string): Promise<ValidateResult> {
  try {
    const raw = await runSidecar(['validate', filePath]);
    const parsed = JSON.parse(raw.trim());
    return parsed as ValidateResult;
  } catch {
    return {
      valid: false,
      gameYear: null,
      yearShort: null,
      supported: false,
      unsupportedReason: null,
      error: 'parse_error',
      message: 'Could not parse sidecar response. Check that Node.js is installed and madden-franchise deps are present.',
    };
  }
}

// ── Extract ───────────────────────────────────────────────────────────────────

/**
 * Extracts game results, roster, and draft data from a validated .frs file.
 * Returns ExtractResult. Never throws.
 */
export async function extractSaveData(filePath: string): Promise<ExtractResult> {
  try {
    const raw = await runSidecar(['extract', filePath]);
    const parsed = JSON.parse(raw.trim());
    return parsed as ExtractResult;
  } catch {
    return {
      gameYear: null,
      games: [],
      players: [],
      draftPicks: [],
      playerStats: [],
      error: 'parse_error',
      message: 'Could not parse extraction output.',
    };
  }
}

// ── Package version check ─────────────────────────────────────────────────────

/**
 * Compare two semver strings (strips leading 'v' prefix) and return true if
 * `latest` is strictly newer than `installed`. Falls back to string inequality
 * if either value is not parseable as semver.
 */
function isNewerVersion(installed: string, latest: string): boolean {
  const strip = (v: string) => v.replace(/^v/, '');
  const a = strip(installed).split('.').map(Number);
  const b = strip(latest).split('.').map(Number);
  // If either has a non-numeric segment, fall back to string comparison
  if (a.some(isNaN) || b.some(isNaN)) return strip(installed) !== strip(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (bv > av) return true;
    if (bv < av) return false;
  }
  return false; // equal versions
}

/**
 * Returns the installed and latest npm versions of madden-franchise.
 * Never throws.
 */
export async function checkMaddenPackageVersion(): Promise<PackageVersionInfo> {
  try {
    const raw = await runSidecar(['version']);
    const parsed = JSON.parse(raw.trim());
    if (parsed.error) {
      return { installed: null, latest: null, updateAvailable: false, error: parsed.message };
    }
    const installed = parsed.version as string;

    const res = await fetch('https://registry.npmjs.org/madden-franchise/latest');
    if (!res.ok) {
      return { installed, latest: null, updateAvailable: false };
    }
    const data = await res.json() as { version: string };
    const latest = data.version;
    return { installed, latest, updateAvailable: isNewerVersion(installed, latest) };
  } catch {
    return { installed: null, latest: null, updateAvailable: false, error: 'Version check failed' };
  }
}

/**
 * Runs `npm install madden-franchise@latest` inside the sidecar directory.
 * Never throws.
 */
export async function updateMaddenPackage(): Promise<UpdateResult> {
  try {
    const raw = await runSidecar(['update']);
    const parsed = JSON.parse(raw.trim());
    if (parsed.error) return { success: false, error: parsed.message };
    return { success: true, version: parsed.version };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Diff computation ──────────────────────────────────────────────────────────

/** Resolve gameType string from Madden to Dynasty OS GameType */
function resolveGameType(raw: string | null): GameType {
  if (!raw) return 'regular';
  const lower = raw.toLowerCase();
  if (lower.includes('playoff') || lower.includes('post')) return 'playoff';
  if (lower.includes('super')) return 'playoff';        // Super Bowl is a playoff game
  if (lower.includes('bowl')) return 'bowl';            // other bowl games
  if (lower.includes('exhibition') || lower.includes('preseason')) return 'exhibition';
  return 'regular';
}

/**
 * Compute the confirmation diff: what will be added vs already exists.
 * teamName = activeDynasty.teamName (used to identify which side is "us")
 */
export async function computeSyncDiff(
  extracted: ExtractResult,
  seasonId: string,
  dynastyId: string,
  teamName: string
): Promise<SyncDiff> {
  const existingGames = await getGamesBySeason(seasonId);
  const existingWeeks = new Set(existingGames.map((g) => g.week));

  const existingPlayers = await getPlayersByDynasty(dynastyId);
  const existingNames = new Set(
    existingPlayers.map((p) => `${p.firstName} ${p.lastName}`.toLowerCase())
  );

  const existingSeasons = await getPlayerSeasonsByDynasty(dynastyId);
  const existingPlayerIds = new Set(existingSeasons.map((s) => s.playerId));

  const teamLower = teamName.toLowerCase();

  // Map raw games → Dynasty OS games
  const gamesToAdd: MappedGame[] = [];
  let gamesSkipped = 0;

  for (const g of extracted.games) {
    if (!g.homeScore || !g.awayScore || g.week === null) {
      gamesSkipped++;
      continue;
    }
    if (existingWeeks.has(g.week)) {
      gamesSkipped++;
      continue;
    }

    const homeTeamLower = (g.homeTeam ?? '').toLowerCase();
    const awayTeamLower = (g.awayTeam ?? '').toLowerCase();

    let homeAway: HomeAway;
    let teamScore: number;
    let opponentScore: number;
    let opponent: string;

    // Try to match by teamName substring — guard against empty strings to avoid
    // false positives (every string includes '', so a null homeTeam would match everything)
    if (
      homeTeamLower.length > 0 &&
      (homeTeamLower.includes(teamLower) || teamLower.includes(homeTeamLower))
    ) {
      homeAway = 'home';
      teamScore = g.homeScore;
      opponentScore = g.awayScore;
      opponent = g.awayTeam ?? 'Unknown';
    } else if (
      awayTeamLower.length > 0 &&
      (awayTeamLower.includes(teamLower) || teamLower.includes(awayTeamLower))
    ) {
      homeAway = 'away';
      teamScore = g.awayScore;
      opponentScore = g.homeScore;
      opponent = g.homeTeam ?? 'Unknown';
    } else {
      // Can't identify our team — skip this game
      gamesSkipped++;
      continue;
    }

    const result: GameResult = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T';

    gamesToAdd.push({
      week: g.week,
      opponent,
      homeAway,
      teamScore,
      opponentScore,
      result,
      gameType: resolveGameType(g.gameType),
    });
  }

  // Map raw players → new players only
  const playersToAdd: RawPlayer[] = [];
  let playersSkipped = 0;

  for (const p of extracted.players) {
    if (!p.name) { playersSkipped++; continue; }
    if (existingNames.has(p.name.toLowerCase())) { playersSkipped++; continue; }
    playersToAdd.push(p);
  }

  // Draft picks — dedupe by round+pick against existing picks for this season
  const existingDraftPicks = await getDraftPicksBySeason(seasonId);
  const existingPickKeys = new Set(
    existingDraftPicks.map((dp) => `${dp.round}-${dp.pickNumber ?? ''}`)
  );

  const draftPicksToAdd: RawDraftPick[] = [];
  let draftPicksSkipped = 0;
  for (const dp of extracted.draftPicks) {
    if (dp.round === null && dp.pick === null) { draftPicksSkipped++; continue; }
    const key = `${dp.round}-${dp.pick ?? ''}`;
    if (existingPickKeys.has(key)) { draftPicksSkipped++; continue; }
    draftPicksToAdd.push(dp);
  }

  return {
    gamesToAdd,
    gamesSkipped,
    playersToAdd,
    playersSkipped,
    draftPicksToAdd,
    draftPicksSkipped,
    playerStats: extracted.playerStats ?? [],
    gameYear: extracted.gameYear,
  };
}

// ── Commit sync helpers ───────────────────────────────────────────────────────

function mapRawStatsToRecord(raw: RawPlayerStat | null, overall: number | null): Record<string, number> {
  const stats: Record<string, number> = {};
  const add = (key: string, val: number | null | undefined) => {
    if (val != null && val !== 0) stats[key] = Number(val);
  };
  add('overall', overall);
  if (raw) {
    add('pass_yards', raw.passYards);
    add('pass_td', raw.passTD);
    add('interceptions', raw.interceptions);
    add('rush_yards', raw.rushYards);
    add('rush_td', raw.rushTD);
    add('rec_yards', raw.recYards);
    add('rec_td', raw.recTD);
    add('receptions', raw.receptions);
    add('sacks', raw.sacks);
    add('tackles', raw.tackles);
  }
  return stats;
}

function findStatsForPlayer(
  playerName: string,
  playerStats: RawPlayerStat[]
): RawPlayerStat | null {
  const target = playerName.trim().toLowerCase();
  if (!target) return null;
  for (const s of playerStats) {
    if (s.playerName && s.playerName.trim().toLowerCase() === target) return s;
  }
  return null;
}

// ── Commit sync ───────────────────────────────────────────────────────────────

export interface CommitResult {
  gamesAdded: number;
  playersAdded: number;
  draftPicksAdded: number;
}

/**
 * Commits the confirmed diff to the Dynasty OS database.
 */
export async function commitSyncDiff(
  diff: SyncDiff,
  seasonId: string,
  dynastyId: string,
  year: number
): Promise<CommitResult> {
  let gamesAdded = 0;
  let playersAdded = 0;
  let draftPicksAdded = 0;

  // Add games
  for (const g of diff.gamesToAdd) {
    await createGame({
      seasonId,
      dynastyId,
      week: g.week,
      opponent: g.opponent,
      homeAway: g.homeAway,
      teamScore: g.teamScore,
      opponentScore: g.opponentScore,
      result: g.result,
      gameType: g.gameType,
      overtime: false,
    });
    gamesAdded++;
  }

  // Add players
  for (const p of diff.playersToAdd) {
    const fullName = (p.name ?? '').trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';
    // createPlayer always returns Player or throws — no null check needed
    const player = await createPlayer({
      dynastyId,
      firstName,
      lastName,
      position: p.position ?? 'Unknown',
      jerseyNumber: p.jerseyNumber ?? undefined,
      status: 'active',
    });
    const matchedStat = findStatsForPlayer(fullName, diff.playerStats);
    const stats = mapRawStatsToRecord(matchedStat, p.overall);
    const existing = await db.playerSeasons
      .where('[playerId+year]')
      .equals([player.id, year])
      .first();
    if (existing) {
      const mergedStats = { ...(existing.stats ?? {}), ...stats };
      await updatePlayerSeason(existing.id, { stats: mergedStats });
    } else {
      await createPlayerSeason({
        playerId: player.id,
        dynastyId,
        seasonId,
        year,
        stats,
      });
    }
    playersAdded++;
  }

  // Apply stats to players that already existed in DB (not in playersToAdd)
  if (diff.playerStats.length > 0) {
    const existingPlayers = await getPlayersByDynasty(dynastyId);
    const existingByName = new Map<string, typeof existingPlayers[number]>();
    for (const ep of existingPlayers) {
      existingByName.set(`${ep.firstName} ${ep.lastName}`.trim().toLowerCase(), ep);
    }
    const newlyAddedNames = new Set(
      diff.playersToAdd.map((p) => (p.name ?? '').trim().toLowerCase())
    );
    for (const stat of diff.playerStats) {
      if (!stat.playerName) continue;
      const key = stat.playerName.trim().toLowerCase();
      if (newlyAddedNames.has(key)) continue; // already handled in the add loop
      const player = existingByName.get(key);
      if (!player) continue;
      const stats = mapRawStatsToRecord(stat, null);
      if (Object.keys(stats).length === 0) continue;
      const existingSeason = await db.playerSeasons
        .where('[playerId+year]')
        .equals([player.id, year])
        .first();
      if (existingSeason) {
        const mergedStats = { ...(existingSeason.stats ?? {}), ...stats };
        await updatePlayerSeason(existingSeason.id, { stats: mergedStats });
      } else {
        await createPlayerSeason({
          playerId: player.id,
          dynastyId,
          seasonId,
          year,
          stats,
        });
      }
    }
  }

  // Add draft picks
  for (const dp of diff.draftPicksToAdd) {
    await createDraftPick({
      dynastyId,
      seasonId,
      year,
      round: dp.round ?? 1,
      pickNumber: dp.pick ?? undefined,
      playerName: '',
      position: '',
      nflTeam: dp.team ?? '',
    });
    draftPicksAdded++;
  }

  return { gamesAdded, playersAdded, draftPicksAdded };
}
