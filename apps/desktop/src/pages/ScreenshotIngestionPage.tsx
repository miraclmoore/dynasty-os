import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { useDynastyStore, useSeasonStore } from '../store';
import { useNavigationStore } from '../store/navigation-store';
import { parseScreenshot, ScreenType, ParsedScreenData, SCREEN_TYPE_LABELS } from '../lib/screenshot-service';
import { usePrefsStore } from '../store/prefs-store';
import * as prefs from '../lib/prefs-service';
import { createGame } from '../lib/game-service';
import { createRecruitingClass, addRecruit } from '../lib/recruiting-service';
import { usePlayerStore } from '../store/player-store';
import { createPlayerSeason, updatePlayerSeason } from '../lib/player-season-service';
import { db } from '@dynasty-os/db';
import { findBestPlayerMatch } from '../lib/fuzzy-match';
import type {
  ScheduleParsedData,
  PlayerStatsParsedData,
  RecruitingParsedData,
  DepthChartParsedData,
  RecruitingMotivationsParsedData,
  NflScheduleParsedData,
  NflPlayerStatsParsedData,
  NflDepthChartParsedData,
} from '../lib/screenshot-service';
import { getHardSellRecommendation } from '../lib/recruiting-calculator';
import type { GameType, GameResult, HomeAway } from '@dynasty-os/core-types';

// ── Editable row types ────────────────────────────────────────────────────────

interface EditableGameRow {
  week: string;
  opponent: string;
  homeAway: string;
  teamScore: string;
  opponentScore: string;
  gameType: string;
}

interface EditablePlayerRow {
  name: string;
  position: string;
  stats: Record<string, string>;
}

interface EditableRecruitRow {
  name: string;
  position: string;
  stars: string;
  state: string;
  nationalRank: string;
}

interface EditableDepthEntry {
  position: string;
  playerName: string;
  depth: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AMBER_INPUT = 'bg-amber-900/20 border-amber-600/50';
const BASE_INPUT =
  'w-full rounded-lg px-3 py-2 text-white text-sm border focus:outline-none focus:ring-1 focus:ring-amber-500';

function mapHomeAway(raw: string): HomeAway {
  if (raw === 'Away') return 'away';
  if (raw === 'Neutral') return 'neutral';
  return 'home';
}

function mapGameType(raw: string): GameType {
  const lower = raw.toLowerCase();
  if (lower === 'conference') return 'conference';
  if (lower === 'bowl') return 'bowl';
  if (lower === 'playoff') return 'playoff';
  if (lower === 'exhibition') return 'exhibition';
  return 'regular';
}

/**
 * Converts raw screenshot stat labels to canonical PlayerSeason.stats keys.
 * Keys must match sport-configs/src/cfb.ts statCategories exactly so stats
 * appear in getSingleSeasonLeaders() in records-service.ts.
 * Keys not in this map are lowercased+underscored as a fallback.
 */
const STAT_KEY_MAP: Record<string, string> = {
  // Passing (keys from cfb.ts + nfl.ts statCategories)
  YDS: 'passingYards',
  ATT: 'attempts',
  CMP: 'completions',
  TD: 'passingTDs',
  INT: 'interceptions',
  RTG: 'passerRating',
  // Rushing
  'RUSH YDS': 'rushingYards',
  'RUSH ATT': 'rushingAttempts',
  'RUSH TD': 'rushingTDs',
  CAR: 'rushingAttempts',
  // Receiving
  REC: 'receptions',
  'REC YDS': 'receivingYards',
  'REC TD': 'receivingTDs',
  RECS: 'receptions',
  // Defense
  TKL: 'tackles',
  SACK: 'sacks',
  'INT DEF': 'defenseInterceptions',
  FF: 'forcedFumbles',
  PD: 'passDeflections',
  // Kicking / Punting
  FGM: 'fgMade',
  FGA: 'fgAttempted',
  PUNTS: 'punts',
  AVG: 'puntAverage',
  'PUNT AVG': 'puntAverage',
  // General
  GP: 'gamesPlayed',
};

function normalizeStatKey(raw: string): string {
  return STAT_KEY_MAP[raw.toUpperCase().trim()] ?? raw.toLowerCase().replace(/\s+/g, '_');
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ScreenshotIngestionPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason } = useSeasonStore();
  const { goToDashboard } = useNavigationStore();

  // Load roster so fuzzy match has data
  useEffect(() => {
    if (activeDynasty) {
      void usePlayerStore.getState().loadPlayers(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // Core state
  const [screenType, setScreenType] = useState<ScreenType | ''>('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedScreenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [enteredKey, setEnteredKey] = useState('');
  const [saving, setSaving] = useState(false);

  // Editable form state per screen type
  const [gameRows, setGameRows] = useState<EditableGameRow[]>([]);
  const [playerRows, setPlayerRows] = useState<EditablePlayerRow[]>([]);
  const [recruitRows, setRecruitRows] = useState<EditableRecruitRow[]>([]);
  const [classRank, setClassRank] = useState('');
  const [totalCommits, setTotalCommits] = useState('');
  const [depthEntries, setDepthEntries] = useState<EditableDepthEntry[]>([]);
  const [depthCsvCopied, setDepthCsvCopied] = useState(false);

  const players = usePlayerStore((s) => s.players);
  // matchedPlayerIds[i] = player.id for row i, or '' if unmatched
  const [matchedPlayerIds, setMatchedPlayerIds] = useState<string[]>([]);
  // combobox input text per row (separate from matched ID so user can keep typing)
  const [playerSearchTerms, setPlayerSearchTerms] = useState<string[]>([]);
  // which row's dropdown is open
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

  // Multi-image progress tracking
  const [imageQueue, setImageQueue] = useState<string[]>([]); // base64 strings
  const [imagePaths, setImagePaths] = useState<string[]>([]); // for display
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  if (!activeDynasty) return null;

  const NFL_SCREEN_TYPES: ScreenType[] = ['nfl-schedule', 'nfl-player-stats', 'nfl-depth-chart'];
  const CFB_SCREEN_TYPES: ScreenType[] = [
    'schedule',
    'player-stats',
    'recruiting',
    'depth-chart',
    'recruiting-motivations',
  ];
  const availableScreenTypes = activeDynasty.sport === 'cfb' ? CFB_SCREEN_TYPES : NFL_SCREEN_TYPES;

  // ── File Open ──────────────────────────────────────────────────────────────

  async function handleFileOpen() {
    const selected = await open({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      multiple: true,
    });
    // open() with multiple:true returns string[] | null (or string | null for single pick)
    const paths = Array.isArray(selected)
      ? selected
      : selected
      ? [selected]
      : [];
    if (paths.length === 0) return;

    setImagePaths(paths);
    setImagePath(paths[0]); // keep single-image alias for thumbnail

    // Read all files to base64 upfront before showing the parse button.
    // Chunk the byte-to-char conversion in segments of 65535 to avoid
    // "Maximum call stack size exceeded" on large images (e.g. 4K screenshots).
    const base64List: string[] = [];
    for (const p of paths) {
      const bytes = await readFile(p);
      const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const CHUNK = 65535;
      let binary = '';
      for (let i = 0; i < uint8.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, uint8.subarray(i, i + CHUNK) as unknown as number[]);
      }
      base64List.push(btoa(binary));
    }
    setImageQueue(base64List);
    setImageBase64(base64List[0] ?? null); // keep single-image alias
    setCurrentImageIndex(0);
    setParsedData(null);
    setError(null);
    setMatchedPlayerIds([]);
    setPlayerSearchTerms([]);
  }

  // ── Parse ──────────────────────────────────────────────────────────────────

  async function handleParse() {
    const queue = imageQueue.length > 0 ? imageQueue : (imageBase64 ? [imageBase64] : []);
    if (queue.length === 0 || !screenType || !activeDynasty) return;
    if (!usePrefsStore.getState().hasApiKey) {
      setApiKeyMissing(true);
      return;
    }

    const total = queue.length;
    setLoading(true);
    setError(null);

    // Reset all editable form state so a re-parse on a different screen type
    // doesn't leave stale rows from the prior parse in state.
    setGameRows([]);
    setPlayerRows([]);
    setRecruitRows([]);
    setDepthEntries([]);
    setMatchedPlayerIds([]);
    setPlayerSearchTerms([]);
    setClassRank('');
    setTotalCommits('');

    // Accumulator arrays — merged from all images
    const mergedGameRows: EditableGameRow[] = [];
    const mergedPlayerRows: EditablePlayerRow[] = [];
    const mergedRecruitRows: EditableRecruitRow[] = [];
    const mergedDepthEntries: EditableDepthEntry[] = [];
    // Local accumulators for player match state (avoids stale-append via functional updaters)
    const allMatchedIds: string[] = [];
    const allSearchTerms: string[] = [];
    let lastRecruitMeta = { classRank: '', totalCommits: '' };
    // For display-only types (depth-chart, recruiting-motivations), store last result
    let lastParsedResult: ParsedScreenData | null = null;

    try {
      for (let idx = 0; idx < total; idx++) {
        setCurrentImageIndex(idx);
        const result = await parseScreenshot(
          screenType as ScreenType,
          queue[idx],
          {
            teamName: activeDynasty.teamName,
            season: String(activeSeason?.year ?? ''),
            gameVersion: activeDynasty.gameVersion,
          }
        );
        if (!result) throw new Error(`Vision API returned no data for image ${idx + 1}`);
        lastParsedResult = result;

        // Accumulate into merged arrays
        if (result.screenType === 'schedule' || result.screenType === 'nfl-schedule') {
          const d = result as ScheduleParsedData | NflScheduleParsedData;
          mergedGameRows.push(
            ...(d.games ?? []).map((g) => ({
              week: String(g.week ?? ''),
              opponent: g.opponent ?? '',
              homeAway: g.homeAway ?? 'Home',
              teamScore: String(g.teamScore ?? ''),
              opponentScore: String(g.opponentScore ?? ''),
              gameType: g.gameType ?? 'regular',
            }))
          );
        } else if (result.screenType === 'player-stats' || result.screenType === 'nfl-player-stats') {
          const d = result as PlayerStatsParsedData | NflPlayerStatsParsedData;
          const newRows = (d.players ?? []).map((p) => ({
            name: p.name ?? '',
            position: p.position ?? '',
            stats: Object.fromEntries(
              Object.entries(p.stats ?? {}).map(([k, v]) => [k, String(v)])
            ),
          }));
          mergedPlayerRows.push(...newRows);
          // Auto-match new rows against roster — collect into local arrays set after loop
          for (const p of (d.players ?? [])) {
            const match = findBestPlayerMatch(p.name ?? '', players);
            allMatchedIds.push(match?.player.id ?? '');
            allSearchTerms.push(match ? `${match.player.firstName} ${match.player.lastName}` : (p.name ?? ''));
          }
        } else if (result.screenType === 'recruiting') {
          const d = result as RecruitingParsedData;
          lastRecruitMeta = {
            classRank: String(d.classRank ?? ''),
            totalCommits: String(d.totalCommits ?? ''),
          };
          mergedRecruitRows.push(
            ...(d.recruits ?? []).map((r) => ({
              name: r.name ?? '',
              position: r.position ?? '',
              stars: String(r.stars ?? ''),
              state: r.state ?? '',
              nationalRank: String(r.nationalRank ?? ''),
            }))
          );
        } else if (result.screenType === 'depth-chart' || result.screenType === 'nfl-depth-chart') {
          const d = result as DepthChartParsedData | NflDepthChartParsedData;
          mergedDepthEntries.push(
            ...(d.entries ?? []).map((e) => ({
              position: e.position ?? '',
              playerName: e.playerName ?? '',
              depth: String(e.depth ?? ''),
            }))
          );
        }
        // recruiting-motivations: lastParsedResult captures the last one for display
      }

      // Commit all merged state at once
      if (mergedGameRows.length > 0) setGameRows(mergedGameRows);
      if (mergedPlayerRows.length > 0) {
        setPlayerRows(mergedPlayerRows);
        setMatchedPlayerIds(allMatchedIds);
        setPlayerSearchTerms(allSearchTerms);
      }
      if (mergedRecruitRows.length > 0) {
        setRecruitRows(mergedRecruitRows);
        setClassRank(lastRecruitMeta.classRank);
        setTotalCommits(lastRecruitMeta.totalCommits);
      }
      if (mergedDepthEntries.length > 0) setDepthEntries(mergedDepthEntries);

      // Set parsedData to the last result for type dispatch in renderConfirmationForm()
      setParsedData(lastParsedResult);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse screenshot');
    } finally {
      setLoading(false);
    }
  }

  // ── Save handlers ──────────────────────────────────────────────────────────

  async function handleSaveSchedule() {
    if (!activeSeason || !activeDynasty) return;
    setSaving(true);
    try {
      for (const row of gameRows) {
        if (!row.opponent || row.teamScore === '' || row.opponentScore === '') continue;
        const tScore = Number(row.teamScore);
        const oScore = Number(row.opponentScore);
        const result: GameResult = tScore > oScore ? 'W' : oScore > tScore ? 'L' : 'T';
        await createGame({
          dynastyId: activeDynasty.id,
          seasonId: activeSeason.id,
          week: Number(row.week) || 1,
          opponent: row.opponent,
          teamScore: tScore,
          opponentScore: oScore,
          result,
          homeAway: mapHomeAway(row.homeAway),
          gameType: mapGameType(row.gameType),
          overtime: false,
        });
      }
      goToDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save games');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRecruiting() {
    if (!activeSeason || !activeDynasty) return;
    setSaving(true);
    try {
      // Calculate star counts from rows
      const fiveStars = recruitRows.filter((r) => Number(r.stars) === 5).length;
      const fourStars = recruitRows.filter((r) => Number(r.stars) === 4).length;
      const threeStars = recruitRows.filter((r) => Number(r.stars) === 3).length;

      const recruitingClass = await createRecruitingClass({
        dynastyId: activeDynasty.id,
        seasonId: activeSeason.id,
        year: activeSeason.year,
        classRank: Number(classRank) || 0,
        totalCommits: Number(totalCommits) || recruitRows.length,
        fiveStars,
        fourStars,
        threeStars,
      });

      for (const row of recruitRows) {
        if (!row.name) continue;
        await addRecruit({
          dynastyId: activeDynasty.id,
          classId: recruitingClass.id,
          name: row.name,
          position: row.position || 'ATH',
          stars: Number(row.stars) || 3,
          state: row.state || undefined,
          nationalRank: row.nationalRank ? Number(row.nationalRank) : undefined,
        });
      }
      goToDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save recruiting class');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStats() {
    if (!activeSeason || !activeDynasty) return;
    setSaving(true);
    try {
      for (let i = 0; i < playerRows.length; i++) {
        const playerId = matchedPlayerIds[i];
        if (!playerId) continue; // unmatched — skip
        const row = playerRows[i];

        // Convert string stats to number, normalize keys, skip NaN and 0
        const stats: Record<string, number> = {};
        for (const [rawKey, rawVal] of Object.entries(row.stats)) {
          const num = parseFloat(rawVal);
          if (!isNaN(num) && num !== 0) {
            stats[normalizeStatKey(rawKey)] = num;
          }
        }
        if (Object.keys(stats).length === 0) continue;

        // Check for an existing PlayerSeason for this player+season (no compound index)
        const existing = await db.playerSeasons
          .where('playerId')
          .equals(playerId)
          .filter((ps) => ps.seasonId === activeSeason.id)
          .first();

        if (existing) {
          // Merge: incoming stats overwrite matching keys, existing keys preserved
          await updatePlayerSeason(existing.id, {
            stats: { ...existing.stats, ...stats },
          });
        } else {
          await createPlayerSeason({
            playerId,
            dynastyId: activeDynasty.id,
            seasonId: activeSeason.id,
            year: activeSeason.year,
            stats,
          });
        }
      }
      goToDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save stats');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyDepthChartCsv() {
    const header = 'Position,Player Name,Depth';
    const rows = depthEntries.map((e) => {
      // Escape fields that contain commas or quotes (RFC 4180-lite)
      const escape = (s: string) =>
        s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      return [escape(e.position), escape(e.playerName), escape(e.depth)].join(',');
    });
    const csv = [header, ...rows].join('\n');
    await navigator.clipboard.writeText(csv);
    setDepthCsvCopied(true);
    setTimeout(() => setDepthCsvCopied(false), 2000);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderThumbnail() {
    if (!imagePath) return null;
    return (
      <img
        src={`asset://localhost/${imagePath}`}
        alt="Screenshot thumbnail"
        className="max-h-32 object-contain rounded border border-gray-700 mb-4"
        onError={(e) => {
          // Fall back to convertFileSrc approach if direct path fails
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  function renderScheduleForm() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {SCREEN_TYPE_LABELS['schedule']}
        </h2>
        {renderThumbnail()}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-2">Week</th>
                <th className="pb-2 pr-2">Opponent</th>
                <th className="pb-2 pr-2">H/A/N</th>
                <th className="pb-2 pr-2">Team Score</th>
                <th className="pb-2 pr-2">Opp Score</th>
                <th className="pb-2 pr-2">Game Type</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {gameRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1 pr-2 w-16">
                    <input
                      type="number"
                      value={row.week}
                      onChange={(e) => {
                        const updated = [...gameRows];
                        updated[i] = { ...updated[i], week: e.target.value };
                        setGameRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={row.opponent}
                      onChange={(e) => {
                        const updated = [...gameRows];
                        updated[i] = { ...updated[i], opponent: e.target.value };
                        setGameRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-28">
                    <select
                      value={row.homeAway}
                      onChange={(e) => {
                        const updated = [...gameRows];
                        updated[i] = { ...updated[i], homeAway: e.target.value };
                        setGameRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    >
                      <option value="Home">Home</option>
                      <option value="Away">Away</option>
                      <option value="Neutral">Neutral</option>
                    </select>
                  </td>
                  <td className="py-1 pr-2 w-24">
                    <input
                      type="number"
                      value={row.teamScore}
                      onChange={(e) => {
                        const updated = [...gameRows];
                        updated[i] = { ...updated[i], teamScore: e.target.value };
                        setGameRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-24">
                    <input
                      type="number"
                      value={row.opponentScore}
                      onChange={(e) => {
                        const updated = [...gameRows];
                        updated[i] = { ...updated[i], opponentScore: e.target.value };
                        setGameRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-32">
                    <input
                      type="text"
                      value={row.gameType}
                      onChange={(e) => {
                        const updated = [...gameRows];
                        updated[i] = { ...updated[i], gameType: e.target.value };
                        setGameRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => setGameRows(gameRows.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() =>
            setGameRows([
              ...gameRows,
              { week: '', opponent: '', homeAway: 'Home', teamScore: '', opponentScore: '', gameType: 'regular' },
            ])
          }
          className="mt-3 text-sm text-gray-400 hover:text-white underline"
        >
          + Add Row
        </button>
        <div className="flex gap-3 mt-6">
          <button
            onClick={goToDashboard}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
          >
            Discard
          </button>
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Log Games'}
          </button>
        </div>
      </div>
    );
  }

  function renderPlayerStatsForm() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          {SCREEN_TYPE_LABELS['player-stats']}
        </h2>
        {renderThumbnail()}
        <div className="flex flex-col gap-4">
          {playerRows.map((row, i) => {
            // Filtered roster for this row's combobox
            const searchTerm = playerSearchTerms[i] ?? '';
            const filteredPlayers = searchTerm.trim().length >= 1
              ? players.filter((p) => {
                  const full = `${p.firstName} ${p.lastName}`.toLowerCase();
                  return full.includes(searchTerm.toLowerCase());
                })
              : players.slice(0, 8); // show first 8 when input is empty

            return (
              <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start gap-3 mb-3">
                  {/* Fuzzy-match combobox */}
                  <div className="flex-1 relative">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Matched Roster Player
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        const updated = [...playerSearchTerms];
                        updated[i] = e.target.value;
                        setPlayerSearchTerms(updated);
                        // Clear the matched ID when user edits manually
                        const ids = [...matchedPlayerIds];
                        ids[i] = '';
                        setMatchedPlayerIds(ids);
                        setOpenDropdownIndex(i);
                      }}
                      onFocus={() => setOpenDropdownIndex(i)}
                      onBlur={() => {
                        // 150ms delay so onMouseDown on option fires first
                        setTimeout(() => setOpenDropdownIndex(null), 150);
                      }}
                      placeholder="Search roster…"
                      className={`${BASE_INPUT} ${
                        matchedPlayerIds[i]
                          ? 'bg-green-900/20 border-green-600/50'
                          : AMBER_INPUT
                      }`}
                    />
                    {openDropdownIndex === i && filteredPlayers.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {filteredPlayers.map((p) => (
                          <li
                            key={p.id}
                            onMouseDown={() => {
                              // onMouseDown fires before onBlur
                              const ids = [...matchedPlayerIds];
                              ids[i] = p.id;
                              setMatchedPlayerIds(ids);
                              const terms = [...playerSearchTerms];
                              terms[i] = `${p.firstName} ${p.lastName}`;
                              setPlayerSearchTerms(terms);
                              setOpenDropdownIndex(null);
                            }}
                            className="px-3 py-2 text-sm text-white hover:bg-gray-700 cursor-pointer"
                          >
                            {p.firstName} {p.lastName}
                            <span className="ml-2 text-xs text-gray-400">{p.position}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Position (read-only display) */}
                  <div className="w-20">
                    <label className="text-xs text-gray-400 mb-1 block">Pos (parsed)</label>
                    <input
                      type="text"
                      value={row.position}
                      readOnly
                      className={`${BASE_INPUT} bg-gray-700/50 border-gray-600 cursor-default`}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setPlayerRows(playerRows.filter((_, idx) => idx !== i));
                      setMatchedPlayerIds(matchedPlayerIds.filter((_, idx) => idx !== i));
                      setPlayerSearchTerms(playerSearchTerms.filter((_, idx) => idx !== i));
                    }}
                    className="text-red-400 hover:text-red-300 text-xs mt-5 px-2 py-1"
                  >
                    Del
                  </button>
                </div>

                {/* Stat fields */}
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(row.stats).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 mb-1 block">{key}</label>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const updated = [...playerRows];
                          updated[i] = {
                            ...updated[i],
                            stats: { ...updated[i].stats, [key]: e.target.value },
                          };
                          setPlayerRows(updated);
                        }}
                        className={`${BASE_INPUT} ${AMBER_INPUT}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Match status badge */}
                <p className="mt-2 text-xs text-gray-500">
                  {matchedPlayerIds[i]
                    ? <span className="text-green-400">Matched — will save stats on confirm</span>
                    : <span className="text-amber-400">No match — select a roster player above to save</span>
                  }
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={goToDashboard}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
          >
            Discard
          </button>
          <button
            onClick={handleSaveStats}
            disabled={saving || matchedPlayerIds.every((id) => !id)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Stats'}
          </button>
        </div>
      </div>
    );
  }

  function renderRecruitingForm() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {SCREEN_TYPE_LABELS['recruiting']}
        </h2>
        {renderThumbnail()}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Class Rank</label>
            <input
              type="number"
              value={classRank}
              onChange={(e) => setClassRank(e.target.value)}
              className={`${BASE_INPUT} ${AMBER_INPUT}`}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Total Commits</label>
            <input
              type="number"
              value={totalCommits}
              onChange={(e) => setTotalCommits(e.target.value)}
              className={`${BASE_INPUT} ${AMBER_INPUT}`}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-2">Name</th>
                <th className="pb-2 pr-2">Pos</th>
                <th className="pb-2 pr-2">Stars</th>
                <th className="pb-2 pr-2">State</th>
                <th className="pb-2 pr-2">Nat. Rank</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {recruitRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => {
                        const updated = [...recruitRows];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setRecruitRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-20">
                    <input
                      type="text"
                      value={row.position}
                      onChange={(e) => {
                        const updated = [...recruitRows];
                        updated[i] = { ...updated[i], position: e.target.value };
                        setRecruitRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-20">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={row.stars}
                      onChange={(e) => {
                        const updated = [...recruitRows];
                        updated[i] = { ...updated[i], stars: e.target.value };
                        setRecruitRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-20">
                    <input
                      type="text"
                      value={row.state}
                      onChange={(e) => {
                        const updated = [...recruitRows];
                        updated[i] = { ...updated[i], state: e.target.value };
                        setRecruitRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-24">
                    <input
                      type="number"
                      value={row.nationalRank}
                      onChange={(e) => {
                        const updated = [...recruitRows];
                        updated[i] = { ...updated[i], nationalRank: e.target.value };
                        setRecruitRows(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => setRecruitRows(recruitRows.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() =>
            setRecruitRows([
              ...recruitRows,
              { name: '', position: '', stars: '3', state: '', nationalRank: '' },
            ])
          }
          className="mt-3 text-sm text-gray-400 hover:text-white underline"
        >
          + Add Recruit
        </button>
        <div className="flex gap-3 mt-6">
          <button
            onClick={goToDashboard}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
          >
            Discard
          </button>
          <button
            onClick={handleSaveRecruiting}
            disabled={saving}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Recruiting Class'}
          </button>
        </div>
      </div>
    );
  }

  function renderDepthChartForm() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          {SCREEN_TYPE_LABELS['depth-chart']}
        </h2>
        {renderThumbnail()}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-2">Position</th>
                <th className="pb-2 pr-2">Player Name</th>
                <th className="pb-2 pr-2">Depth</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {depthEntries.map((entry, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1 pr-2 w-24">
                    <input
                      type="text"
                      value={entry.position}
                      onChange={(e) => {
                        const updated = [...depthEntries];
                        updated[i] = { ...updated[i], position: e.target.value };
                        setDepthEntries(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      value={entry.playerName}
                      onChange={(e) => {
                        const updated = [...depthEntries];
                        updated[i] = { ...updated[i], playerName: e.target.value };
                        setDepthEntries(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1 pr-2 w-20">
                    <input
                      type="number"
                      value={entry.depth}
                      onChange={(e) => {
                        const updated = [...depthEntries];
                        updated[i] = { ...updated[i], depth: e.target.value };
                        setDepthEntries(updated);
                      }}
                      className={`${BASE_INPUT} ${AMBER_INPUT}`}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => setDepthEntries(depthEntries.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={goToDashboard}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => { void handleCopyDepthChartCsv(); }}
            disabled={depthEntries.length === 0}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {depthCsvCopied ? 'Copied!' : 'Copy as CSV'}
          </button>
        </div>
      </div>
    );
  }

  function renderRecruitingMotivationsForm() {
    if (!parsedData || parsedData.screenType !== 'recruiting-motivations') return null;
    const d = parsedData as RecruitingMotivationsParsedData;
    // Render the first recruit's motivations (CFB 26 pitch screen is per-prospect)
    const recruit = (d.recruits ?? [])[0];
    if (!recruit) return null;

    const recommendation = getHardSellRecommendation(
      recruit.motivation1Grade,
      recruit.motivation2Grade,
      recruit.motivation3Grade,
    );
    const isHardSell = recommendation === 'Hard Sell';

    const motivationRows = [
      { label: recruit.motivation1, grade: recruit.motivation1Grade },
      { label: recruit.motivation2, grade: recruit.motivation2Grade },
      { label: recruit.motivation3, grade: recruit.motivation3Grade },
    ].filter((m) => m.label || m.grade);

    function gradeColor(grade: string | null | undefined): string {
      if (!grade) return 'text-gray-500';
      if (grade.startsWith('A')) return 'text-green-400';
      if (grade.startsWith('B')) return 'text-amber-400';
      return 'text-red-400';
    }

    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          {SCREEN_TYPE_LABELS['recruiting-motivations']}
          {recruit.name && (
            <span className="ml-2 text-base font-normal text-gray-400">— {recruit.name}</span>
          )}
        </h2>
        {renderThumbnail()}

        {/* Inline recommendation banner — only shown when all 3 grades present */}
        {recommendation && (
          <div
            className={`rounded-lg p-4 mb-4 border ${
              isHardSell
                ? 'bg-green-900/20 border-green-600/50'
                : 'bg-amber-900/20 border-amber-600/50'
            }`}
          >
            <p className="text-sm font-semibold text-white">
              Recommendation:{' '}
              <span className={isHardSell ? 'text-green-400' : 'text-amber-400'}>
                {recommendation}
              </span>
            </p>
          </div>
        )}

        {/* Motivation category table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="pb-2 pr-4">Motivation</th>
                <th className="pb-2 pr-4">Grade</th>
                <th className="pb-2">Deal Breaker</th>
              </tr>
            </thead>
            <tbody>
              {motivationRows.map((m, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 pr-4 text-white">{m.label ?? '—'}</td>
                  <td className="py-2 pr-4">
                    <span className={`font-bold ${gradeColor(m.grade)}`}>
                      {m.grade ?? '—'}
                    </span>
                  </td>
                  <td className="py-2">
                    {recruit.dealBreaker === m.label ? (
                      <span className="text-red-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={goToDashboard}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  function renderConfirmationForm() {
    if (!parsedData) return null;
    switch (parsedData.screenType) {
      case 'schedule':
      case 'nfl-schedule':
        return renderScheduleForm();
      case 'player-stats':
      case 'nfl-player-stats':
        return renderPlayerStatsForm();
      case 'recruiting':
        return renderRecruitingForm();
      case 'depth-chart':
      case 'nfl-depth-chart':
        return renderDepthChartForm();
      case 'recruiting-motivations':
        return renderRecruitingMotivationsForm();
      default:
        return null;
    }
  }

  // ── Page render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Parse Screenshot</h1>
            <p className="text-sm text-gray-400">{activeDynasty.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* API Key Missing State */}
        {apiKeyMissing && (
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-300 mb-4">
              An Anthropic API key is required for screenshot parsing.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Enter API key (sk-ant-...)"
                value={enteredKey}
                onChange={(e) => setEnteredKey(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (enteredKey.trim()) {
                      void prefs.setApiKey(enteredKey.trim());
                      setApiKeyMissing(false);
                      setEnteredKey('');
                    }
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg"
                >
                  Save Key
                </button>
                <button
                  onClick={goToDashboard}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">
              {imageQueue.length > 1
                ? `Parsing ${currentImageIndex + 1} of ${imageQueue.length}…`
                : 'Parsing screenshot…'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={handleParse}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-sm rounded text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Step 1 + 2: Screen Type + File Selection (pre-parse) */}
        {!parsedData && imagePaths.length === 0 && !loading && !apiKeyMissing && (
          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            {/* Step 1: Screen Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                1. Select Screen Type
              </label>
              <select
                value={screenType}
                onChange={(e) => setScreenType(e.target.value as ScreenType | '')}
                className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Select a screen type --</option>
                {availableScreenTypes.map((type) => (
                  <option key={type} value={type}>{SCREEN_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>

            {/* Step 2: File Picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                2. Select Screenshot
              </label>
              <button
                onClick={handleFileOpen}
                disabled={!screenType}
                className={`bg-gray-700 hover:bg-gray-600 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                  !screenType ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Choose Image File(s)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Image Preview + Parse (shown after file selection, before parse) */}
        {!parsedData && imagePaths.length > 0 && !loading && !apiKeyMissing && (
          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            {imagePaths.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  3. Preview &amp; Parse
                </label>
                <img
                  src={imagePaths[0]}
                  alt="Screenshot preview"
                  className="w-full max-h-96 object-contain rounded-lg border border-gray-700 mb-2"
                />
                {imagePaths.length > 1 && (
                  <p className="text-xs text-gray-400 mb-4">
                    +{imagePaths.length - 1} more image{imagePaths.length > 2 ? 's' : ''} selected
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={goToDashboard}
                    className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleParse}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg"
                  >
                    {imagePaths.length > 1
                      ? `Parse ${imagePaths.length} Screenshots`
                      : 'Parse Screenshot'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Form (post-parse) */}
        {parsedData && !loading && (
          <div className="bg-gray-800 rounded-lg p-6">
            {renderConfirmationForm()}
          </div>
        )}
      </main>
    </div>
  );
}
