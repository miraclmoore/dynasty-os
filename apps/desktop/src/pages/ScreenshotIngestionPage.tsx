import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { useDynastyStore, useSeasonStore } from '../store';
import { useNavigationStore } from '../store/navigation-store';
import { parseScreenshot, ScreenType, ParsedScreenData, SCREEN_TYPE_LABELS } from '../lib/screenshot-service';
import { getApiKey, setApiKey } from '../lib/legacy-card-service';
import { createGame } from '../lib/game-service';
import { createRecruitingClass, addRecruit } from '../lib/recruiting-service';
import type {
  ScheduleParsedData,
  PlayerStatsParsedData,
  RecruitingParsedData,
  DepthChartParsedData,
  NflScheduleParsedData,
  NflPlayerStatsParsedData,
  NflDepthChartParsedData,
} from '../lib/screenshot-service';
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

// ── Main Component ────────────────────────────────────────────────────────────

export function ScreenshotIngestionPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason } = useSeasonStore();
  const { goToDashboard, goToRoster } = useNavigationStore();

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

  if (!activeDynasty) return null;

  const NFL_SCREEN_TYPES: ScreenType[] = ['nfl-schedule', 'nfl-player-stats', 'nfl-depth-chart'];
  const CFB_SCREEN_TYPES: ScreenType[] = ['schedule', 'player-stats', 'recruiting', 'depth-chart'];
  const availableScreenTypes = activeDynasty.sport === 'cfb' ? CFB_SCREEN_TYPES : NFL_SCREEN_TYPES;

  // ── File Open ──────────────────────────────────────────────────────────────

  async function handleFileOpen() {
    const selected = await open({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      multiple: false,
    });
    if (!selected || typeof selected !== 'string') return;
    setImagePath(selected);
    // Read file bytes and convert to base64
    const bytes = await readFile(selected);
    const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);
    setImageBase64(base64);
    // Reset any previous parse state
    setParsedData(null);
    setError(null);
  }

  // ── Parse ──────────────────────────────────────────────────────────────────

  async function handleParse() {
    if (!imageBase64 || !screenType || !activeDynasty) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      setApiKeyMissing(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await parseScreenshot(
        screenType as ScreenType,
        imageBase64,
        {
          teamName: activeDynasty.name,
          season: String(activeSeason?.year ?? ''),
          gameVersion: activeDynasty.gameVersion,
        }
      );
      if (!result) throw new Error('Vision API returned no data');
      setParsedData(result);
      initEditableState(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse screenshot');
    } finally {
      setLoading(false);
    }
  }

  function initEditableState(data: ParsedScreenData) {
    if (data.screenType === 'schedule' || data.screenType === 'nfl-schedule') {
      const d = data as ScheduleParsedData | NflScheduleParsedData;
      setGameRows(
        (d.games ?? []).map((g) => ({
          week: String(g.week ?? ''),
          opponent: g.opponent ?? '',
          homeAway: g.homeAway ?? 'Home',
          teamScore: String(g.teamScore ?? ''),
          opponentScore: String(g.opponentScore ?? ''),
          gameType: g.gameType ?? 'regular',
        }))
      );
    } else if (data.screenType === 'player-stats' || data.screenType === 'nfl-player-stats') {
      const d = data as PlayerStatsParsedData | NflPlayerStatsParsedData;
      setPlayerRows(
        (d.players ?? []).map((p) => ({
          name: p.name ?? '',
          position: p.position ?? '',
          stats: Object.fromEntries(
            Object.entries(p.stats ?? {}).map(([k, v]) => [k, String(v)])
          ),
        }))
      );
    } else if (data.screenType === 'recruiting') {
      const d = data as RecruitingParsedData;
      setClassRank(String(d.classRank ?? ''));
      setTotalCommits(String(d.totalCommits ?? ''));
      setRecruitRows(
        (d.recruits ?? []).map((r) => ({
          name: r.name ?? '',
          position: r.position ?? '',
          stars: String(r.stars ?? ''),
          state: r.state ?? '',
          nationalRank: String(r.nationalRank ?? ''),
        }))
      );
    } else if (data.screenType === 'depth-chart' || data.screenType === 'nfl-depth-chart') {
      const d = data as DepthChartParsedData | NflDepthChartParsedData;
      setDepthEntries(
        (d.entries ?? []).map((e) => ({
          position: e.position ?? '',
          playerName: e.playerName ?? '',
          depth: String(e.depth ?? ''),
        }))
      );
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
        const result: GameResult = tScore > oScore ? 'W' : 'L';
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
        <div className="bg-amber-900/10 border border-amber-600/30 rounded-lg p-4 mb-4">
          <p className="text-amber-300 text-sm">
            Review parsed player data below. To log stats, go to the Roster and select each player.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {playerRows.map((row, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      const updated = [...playerRows];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setPlayerRows(updated);
                    }}
                    className={`${BASE_INPUT} ${AMBER_INPUT}`}
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-400 mb-1 block">Position</label>
                  <input
                    type="text"
                    value={row.position}
                    onChange={(e) => {
                      const updated = [...playerRows];
                      updated[i] = { ...updated[i], position: e.target.value };
                      setPlayerRows(updated);
                    }}
                    className={`${BASE_INPUT} ${AMBER_INPUT}`}
                  />
                </div>
                <button
                  onClick={() => setPlayerRows(playerRows.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-300 text-xs mt-5 px-2 py-1"
                >
                  Del
                </button>
              </div>
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
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={goToDashboard}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
          >
            Return to Dashboard
          </button>
          <button
            onClick={goToRoster}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg"
          >
            Go to Roster
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
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
          <p className="text-gray-400 text-sm">
            Review parsed depth chart below. Use this to reference your roster assignments.
            Depth charts are not saved to the database in V1.
          </p>
        </div>
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
                      setApiKey(enteredKey.trim());
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
            <p className="text-gray-400">Parsing screenshot...</p>
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
        {!parsedData && !loading && !apiKeyMissing && (
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
                Choose Image File
              </button>
            </div>

            {/* Step 3: Image Preview + Parse */}
            {imagePath && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  3. Preview &amp; Parse
                </label>
                <img
                  src={imagePath}
                  alt="Screenshot preview"
                  className="w-full max-h-96 object-contain rounded-lg border border-gray-700 mb-4"
                />
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
                    Parse Screenshot
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
