#!/usr/bin/env node
/**
 * madden-reader.cjs — Dynasty OS Madden franchise save file sidecar
 *
 * Invoked by the Tauri frontend via @tauri-apps/plugin-shell:
 *   Command.sidecar('binaries/madden-reader', [subcommand, filePath])
 *
 * Subcommands:
 *   validate <filePath>  — Check if file is a valid Madden franchise save, return version info
 *   extract  <filePath>  — Extract game results, roster, player stats, draft data as JSON
 *
 * Always writes a JSON object to stdout. On error, exits with code 1 and writes
 * { "error": "<type>", "message": "<human text>" } to stdout.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ── Helpers ──────────────────────────────────────────────────────────────────

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function fail(errorType, message) {
  respond({ error: errorType, message });
  process.exit(1);
}

function getArg(idx) {
  return process.argv[idx] ?? null;
}

// ── Load library ─────────────────────────────────────────────────────────────

let FranchiseFile;
try {
  // madden-franchise v4+ ships a CJS dist that exports FranchiseFile as both
  // the default export and a named export.
  const pkg = require('madden-franchise');
  FranchiseFile = pkg.FranchiseFile ?? pkg.default ?? pkg;
} catch (e) {
  fail('library_not_found', `madden-franchise not installed. Run: npm install inside apps/desktop/src-tauri/sidecar/. Original error: ${e.message}`);
}

// ── Validate subcommand ───────────────────────────────────────────────────────

async function validateFile(filePath) {
  if (!filePath) fail('missing_path', 'No file path provided');
  if (!fs.existsSync(filePath)) fail('file_not_found', `File not found: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.frs') {
    fail('invalid_extension', `Expected .frs file, got: ${ext || '(no extension)'}`);
  }

  try {
    const franchise = await FranchiseFile.create(filePath, { autoParse: true });
    const yearShort = franchise.gameYear;   // 2-digit year: 19, 20 ... 26
    const yearFull = yearShort ? 2000 + yearShort : null;

    respond({
      valid: true,
      gameYear: yearFull,
      yearShort,
      supported: true, // madden-franchise v4.1.6 supports Madden 19–26
      unsupportedReason: null,
    });
  } catch (err) {
    fail('parse_error', `Failed to open franchise file: ${err.message}`);
  }
}

// ── Extract subcommand ────────────────────────────────────────────────────────

async function extractData(filePath) {
  if (!filePath) fail('missing_path', 'No file path provided');
  if (!fs.existsSync(filePath)) fail('file_not_found', `File not found: ${filePath}`);

  try {
    const franchise = await FranchiseFile.create(filePath, { autoParse: true });
    const yearShort = franchise.gameYear;
    const yearFull = yearShort ? 2000 + yearShort : null;

    const result = {
      gameYear: yearFull,
      games: [],
      players: [],
      draftPicks: [],
    };

    // ── Season schedule / game results ──────────────────────────────────────
    const scheduleTableNames = ['SeasonGame', 'NFLSchedule', 'ScheduleTable', 'Schedule'];
    for (const tableName of scheduleTableNames) {
      try {
        const table = franchise.getTableByName(tableName);
        if (!table) continue;

        await table.readRecords(['HomeScore', 'AwayScore', 'SeasonWeek', 'Week',
          'HomeTeamIndex', 'AwayTeamIndex', 'SeasonType', 'GameType']);

        for (const record of table.records) {
          if (record.isEmpty) continue;
          try {
            const homeScore = record.HomeScore ?? null;
            const awayScore = record.AwayScore ?? null;
            const week = record.SeasonWeek ?? record.Week ?? null;
            const gameType = record.SeasonType ?? record.GameType ?? null;
            const homeTeam = record.HomeTeamIndex ?? null;
            const awayTeam = record.AwayTeamIndex ?? null;

            // Only include played games
            if (homeScore === null || awayScore === null ||
                (homeScore === 0 && awayScore === 0)) continue;

            result.games.push({
              week: week !== null ? Number(week) : null,
              homeTeam: homeTeam !== null ? String(homeTeam) : null,
              awayTeam: awayTeam !== null ? String(awayTeam) : null,
              homeScore: Number(homeScore),
              awayScore: Number(awayScore),
              gameType: gameType !== null ? String(gameType) : null,
            });
          } catch (_) { /* skip malformed record */ }
        }
        if (result.games.length > 0) break;
      } catch (_) { /* table not in this version */ }
    }

    // ── Roster / player data ─────────────────────────────────────────────────
    const playerTableNames = ['Player', 'PlayerTable'];
    for (const tableName of playerTableNames) {
      try {
        const table = franchise.getTableByName(tableName);
        if (!table) continue;

        await table.readRecords(['FirstName', 'LastName', 'Position',
          'PlayerBestOvr', 'OverallRating', 'Age', 'JerseyNum']);

        for (const record of table.records) {
          if (record.isEmpty) continue;
          try {
            const firstName = record.FirstName ?? '';
            const lastName = record.LastName ?? '';
            const name = `${firstName} ${lastName}`.trim() || null;
            if (!name) continue;

            result.players.push({
              name,
              position: record.Position ? String(record.Position) : null,
              overall: record.PlayerBestOvr ?? record.OverallRating ?? null,
              age: record.Age ?? null,
              jerseyNumber: record.JerseyNum ?? null,
            });
          } catch (_) { /* skip malformed record */ }
        }
        if (result.players.length > 0) break;
      } catch (_) { /* table not in this version */ }
    }

    // ── Draft picks ──────────────────────────────────────────────────────────
    const draftTableNames = ['DraftPick', 'NFLDraftPick', 'DraftPickTable'];
    for (const tableName of draftTableNames) {
      try {
        const table = franchise.getTableByName(tableName);
        if (!table) continue;

        await table.readRecords(['Round', 'PickNum', 'CurrentTeam', 'TeamIndex']);

        for (const record of table.records) {
          if (record.isEmpty) continue;
          try {
            const round = record.Round ?? null;
            const pick = record.PickNum ?? null;
            const team = record.CurrentTeam ?? record.TeamIndex ?? null;
            if (round === null && pick === null) continue;

            result.draftPicks.push({
              round: round !== null ? Number(round) : null,
              pick: pick !== null ? Number(pick) : null,
              team: team !== null ? String(team) : null,
            });
          } catch (_) { /* skip malformed record */ }
        }
        if (result.draftPicks.length > 0) break;
      } catch (_) { /* table not in this version */ }
    }

    respond(result);
  } catch (err) {
    fail('extract_error', `Data extraction failed: ${err.message}`);
  }
}

// ── Version subcommand ────────────────────────────────────────────────────────

function getInstalledVersion() {
  try {
    const pkgPath = path.join(__dirname, 'node_modules', 'madden-franchise', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    respond({ version: pkg.version });
  } catch (err) {
    fail('version_error', `Failed to read madden-franchise version: ${err.message}`);
  }
}

// ── Update subcommand ─────────────────────────────────────────────────────────

function updatePackage() {
  try {
    const { execSync } = require('child_process');
    execSync('npm install madden-franchise@latest', { cwd: __dirname, stdio: 'pipe' });
    const pkgPath = path.join(__dirname, 'node_modules', 'madden-franchise', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    respond({ success: true, version: pkg.version });
  } catch (err) {
    fail('update_error', `Failed to update madden-franchise: ${err.message}`);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const subcommand = getArg(2);
const filePath = getArg(3);

switch (subcommand) {
  case 'validate':
    validateFile(filePath).catch((err) => fail('unexpected_error', err.message));
    break;
  case 'extract':
    extractData(filePath).catch((err) => fail('unexpected_error', err.message));
    break;
  case 'version':
    getInstalledVersion();
    break;
  case 'update':
    updatePackage();
    break;
  default:
    fail('unknown_command', `Unknown subcommand: "${subcommand}". Use validate, extract, version, or update.`);
}
