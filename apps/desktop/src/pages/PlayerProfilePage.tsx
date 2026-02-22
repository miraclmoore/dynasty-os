import React, { useEffect, useState, useMemo } from 'react';
import type { PlayerStatus, PlayerSeason } from '@dynasty-os/core-types';
import { getSportConfig } from '@dynasty-os/sport-configs';
import { useNavigationStore } from '../store/navigation-store';
import { usePlayerStore } from '../store/player-store';
import { usePlayerSeasonStore } from '../store/player-season-store';
import { useDynastyStore } from '../store';
import { computeCareerStats, computeCareerAwards } from '../lib/career-stats';
import { EditPlayerModal } from '../components/EditPlayerModal';
import { LogPlayerSeasonModal } from '../components/LogPlayerSeasonModal';

const STATUS_LABEL: Record<PlayerStatus, string> = {
  active: 'Active',
  graduated: 'Graduated',
  transferred: 'Transferred',
  drafted: 'Drafted',
  injured: 'Injured',
  other: 'Other',
};

const STATUS_BADGE: Record<PlayerStatus, string> = {
  active: 'bg-green-900/50 text-green-300',
  graduated: 'bg-blue-900/50 text-blue-300',
  transferred: 'bg-yellow-900/50 text-yellow-300',
  drafted: 'bg-purple-900/50 text-purple-300',
  injured: 'bg-red-900/50 text-red-300',
  other: 'bg-gray-700 text-gray-400',
};

const DEPARTED_STATUSES: PlayerStatus[] = ['graduated', 'transferred', 'drafted', 'injured', 'other'];

function renderStars(count: number) {
  return (
    <span className="text-yellow-500 text-sm tracking-tight">
      {'★'.repeat(count)}
      <span className="text-gray-600">{'☆'.repeat(5 - count)}</span>
    </span>
  );
}

// Position groups for showing relevant stats in per-season table
const POSITION_STAT_KEYS: Record<string, string[]> = {
  QB: ['gamesPlayed', 'passingYards', 'passingTDs', 'interceptions', 'completions', 'attempts', 'passerRating', 'rushingYards', 'rushingTDs'],
  RB: ['gamesPlayed', 'rushingYards', 'rushingTDs', 'rushingAttempts', 'receivingYards', 'receptions'],
  HB: ['gamesPlayed', 'rushingYards', 'rushingTDs', 'rushingAttempts', 'receivingYards', 'receptions'],
  FB: ['gamesPlayed', 'rushingYards', 'rushingTDs', 'rushingAttempts', 'receivingYards', 'receptions'],
  WR: ['gamesPlayed', 'receivingYards', 'receivingTDs', 'receptions', 'rushingYards', 'rushingTDs'],
  TE: ['gamesPlayed', 'receivingYards', 'receivingTDs', 'receptions'],
  K: ['gamesPlayed', 'fgMade', 'fgAttempted'],
  P: ['gamesPlayed', 'punts', 'puntAverage'],
};

const DEFAULT_OFFENSIVE_KEYS = ['gamesPlayed', 'rushingYards', 'rushingTDs', 'receivingYards', 'receivingTDs'];
const DEFAULT_DEFENSIVE_KEYS = ['gamesPlayed', 'tackles', 'sacks', 'defenseInterceptions', 'forcedFumbles', 'passDeflections'];
const DEFENSIVE_POSITIONS = ['DL', 'LB', 'CB', 'S', 'LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'FS', 'SS'];

function getPositionStatKeys(position: string): string[] {
  if (POSITION_STAT_KEYS[position]) return POSITION_STAT_KEYS[position];
  if (DEFENSIVE_POSITIONS.includes(position)) return DEFAULT_DEFENSIVE_KEYS;
  return DEFAULT_OFFENSIVE_KEYS;
}

export function PlayerProfilePage() {
  const pageParams = useNavigationStore((s) => s.pageParams);
  const playerId = pageParams.playerId ?? '';
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);

  const { players } = usePlayerStore();
  const { playerSeasons } = usePlayerSeasonStore();

  const player = players.find((p) => p.id === playerId);

  const [editOpen, setEditOpen] = useState(false);
  const [logSeasonOpen, setLogSeasonOpen] = useState(false);
  const [departureOpen, setDepartureOpen] = useState(false);

  // Departure form state
  const [departureType, setDepartureType] = useState<PlayerStatus>('graduated');
  const [departureYear, setDepartureYear] = useState('');
  const [departureReason, setDepartureReason] = useState('');
  const [departureError, setDepartureError] = useState('');

  useEffect(() => {
    if (playerId) {
      usePlayerSeasonStore.getState().loadPlayerSeasons(playerId);
    }
  }, [playerId]);

  const sportConfig = useMemo(
    () => activeDynasty ? getSportConfig(activeDynasty.sport) : null,
    [activeDynasty?.sport]
  );

  // Career stats
  const careerStats = useMemo(() => computeCareerStats(playerSeasons), [playerSeasons]);
  const careerAwards = useMemo(() => computeCareerAwards(playerSeasons), [playerSeasons]);

  // Group career stats by stat category group
  const careerStatsByGroup = useMemo(() => {
    if (!sportConfig) return [];
    const groupMap: Record<string, Array<{ key: string; label: string; value: number }>> = {};
    for (const statCat of sportConfig.statCategories) {
      const value = careerStats[statCat.key];
      if (value === undefined || value === 0) continue;
      if (!groupMap[statCat.group]) groupMap[statCat.group] = [];
      groupMap[statCat.group].push({ key: statCat.key, label: statCat.label, value });
    }
    return Object.entries(groupMap);
  }, [careerStats, sportConfig]);

  // Per-season table stat keys based on position
  const seasonTableKeys = useMemo(() => {
    if (!player || !sportConfig) return [];
    const positionKeys = getPositionStatKeys(player.position);
    // Filter to only keys that have a label in sport config
    const configKeyToLabel: Record<string, string> = {};
    for (const s of sportConfig.statCategories) configKeyToLabel[s.key] = s.label;
    return positionKeys.filter((k) => configKeyToLabel[k]).map((k) => ({
      key: k,
      label: configKeyToLabel[k],
    }));
  }, [player?.position, sportConfig]);

  async function handleDepartureSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDepartureError('');
    if (!player) return;

    try {
      await usePlayerStore.getState().updatePlayer(player.id, {
        status: departureType,
        departureYear: departureYear !== '' ? parseInt(departureYear, 10) : undefined,
        departureReason: departureReason.trim() || undefined,
      });
      setDepartureOpen(false);
      setDepartureReason('');
      setDepartureYear('');
    } catch (err) {
      setDepartureError(String(err));
    }
  }

  if (!activeDynasty) return null;

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Player not found.</p>
          <button
            onClick={() => useNavigationStore.getState().goToRoster()}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Back to Roster
          </button>
        </div>
      </div>
    );
  }

  const isActive = player.status === 'active';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useNavigationStore.getState().goToRoster()}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Roster
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold tracking-tight">
              {player.firstName} {player.lastName}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[player.status]}`}
            >
              {STATUS_LABEL[player.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
            >
              Edit Player
            </button>
            {isActive && (
              <button
                onClick={() => setLogSeasonOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Log Season Stats
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Bio section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Position</p>
              <p className="text-white font-semibold text-lg">{player.position}</p>
            </div>
            {player.jerseyNumber !== undefined && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Jersey</p>
                <p className="text-white font-semibold text-lg">#{player.jerseyNumber}</p>
              </div>
            )}
            {player.classYear && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Class</p>
                <p className="text-white font-semibold text-lg">{player.classYear}</p>
              </div>
            )}
            {player.recruitingStars !== undefined && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recruiting</p>
                <p className="text-lg">{renderStars(player.recruitingStars)}</p>
              </div>
            )}
            {(player.homeCity || player.homeState) && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Hometown</p>
                <p className="text-white">
                  {player.homeCity && player.homeState
                    ? `${player.homeCity}, ${player.homeState}`
                    : player.homeState ?? player.homeCity}
                </p>
              </div>
            )}
            {player.height && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Height</p>
                <p className="text-white">{player.height}</p>
              </div>
            )}
            {player.weight && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Weight</p>
                <p className="text-white">{player.weight} lbs</p>
              </div>
            )}
          </div>
          {player.notes && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-gray-300 text-sm">{player.notes}</p>
            </div>
          )}
        </div>

        {/* Departure info (if departed) */}
        {!isActive && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Departure</h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${STATUS_BADGE[player.status]}`}>
                  {STATUS_LABEL[player.status]}
                </span>
              </div>
              {player.departureYear && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Year</p>
                  <p className="text-white font-medium">{player.departureYear}</p>
                </div>
              )}
              {player.departureReason && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Details</p>
                  <p className="text-gray-300">{player.departureReason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Career Totals */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Career Totals</h2>

          {playerSeasons.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No seasons logged yet.{' '}
              {isActive && (
                <button
                  onClick={() => setLogSeasonOpen(true)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Log the first season.
                </button>
              )}
            </p>
          ) : careerStatsByGroup.length === 0 ? (
            <p className="text-gray-500 text-sm">No stats to display.</p>
          ) : (
            <div className="space-y-4">
              {careerStatsByGroup.map(([groupName, stats]) => (
                <div key={groupName}>
                  <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2">{groupName}</h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {stats.map(({ key, label, value }) => (
                      <div key={key} className="bg-gray-700/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                        <p className="text-white font-semibold text-sm">
                          {typeof value === 'number' && !Number.isInteger(value)
                            ? value.toFixed(1)
                            : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Career awards */}
          {careerAwards.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Career Awards</p>
              <div className="flex flex-wrap gap-2">
                {careerAwards.map((award) => (
                  <span
                    key={award}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-800/50"
                  >
                    {award}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Season-by-Season History */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Season History
              {playerSeasons.length > 0 && (
                <span className="ml-2 text-gray-600 normal-case font-normal">
                  ({playerSeasons.length} season{playerSeasons.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            {isActive && (
              <button
                onClick={() => setLogSeasonOpen(true)}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                + Log Season
              </button>
            )}
          </div>

          {playerSeasons.length === 0 ? (
            <p className="text-gray-500 text-sm">No seasons logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">Year</th>
                    <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">OVR</th>
                    {seasonTableKeys.map((sk) => (
                      <th key={sk.key} className="text-right text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">
                        {sk.label}
                      </th>
                    ))}
                    <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">Awards</th>
                  </tr>
                </thead>
                <tbody>
                  {[...playerSeasons].sort((a: PlayerSeason, b: PlayerSeason) => b.year - a.year).map((season: PlayerSeason) => (
                    <tr key={season.id} className="border-b border-gray-700/40 hover:bg-gray-700/20 transition-colors">
                      <td className="px-2 py-2.5 text-white font-medium">{season.year}</td>
                      <td className="px-2 py-2.5 text-gray-400">
                        {season.overallRating !== undefined ? (
                          <span className="font-medium text-white">{season.overallRating}</span>
                        ) : '—'}
                      </td>
                      {seasonTableKeys.map((sk) => (
                        <td key={sk.key} className="px-2 py-2.5 text-right text-gray-300">
                          {season.stats[sk.key] !== undefined ? (
                            typeof season.stats[sk.key] === 'number' && !Number.isInteger(season.stats[sk.key])
                              ? season.stats[sk.key].toFixed(1)
                              : season.stats[sk.key]
                          ) : '—'}
                        </td>
                      ))}
                      <td className="px-2 py-2.5">
                        {season.awards && season.awards.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {season.awards.map((award) => (
                              <span key={award} className="text-xs bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded">
                                {award}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Departure section — only for active players */}
        {isActive && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Departure</h2>

            {!departureOpen ? (
              <button
                onClick={() => {
                  setDepartureOpen(true);
                  setDepartureType('graduated');
                  setDepartureYear('');
                  setDepartureReason('');
                  setDepartureError('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors border border-gray-600"
              >
                Record Departure
              </button>
            ) : (
              <form onSubmit={handleDepartureSubmit} className="space-y-3 max-w-sm">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Departure Type</label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={departureType}
                    onChange={(e) => setDepartureType(e.target.value as PlayerStatus)}
                  >
                    {DEPARTED_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Departure Year <span className="text-gray-600 text-xs">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2099"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 2025"
                    value={departureYear}
                    onChange={(e) => setDepartureYear(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Details <span className="text-gray-600 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 3rd round, Dallas Cowboys"
                    value={departureReason}
                    onChange={(e) => setDepartureReason(e.target.value)}
                  />
                </div>
                {departureError && (
                  <p className="text-red-400 text-sm">{departureError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDepartureOpen(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Confirm Departure
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {editOpen && (
        <EditPlayerModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          player={player}
          sport={activeDynasty.sport}
        />
      )}

      {logSeasonOpen && (
        <LogPlayerSeasonModal
          isOpen={logSeasonOpen}
          onClose={() => setLogSeasonOpen(false)}
          player={player}
          dynastyId={activeDynasty.id}
        />
      )}
    </div>
  );
}
