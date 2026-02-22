import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { usePlayerStore } from '../store/player-store';
import { useNavigationStore } from '../store/navigation-store';
import { DynastySwitcher } from '../components/DynastySwitcher';
import { AddPlayerModal } from '../components/AddPlayerModal';
import { EditPlayerModal } from '../components/EditPlayerModal';
import { LogPlayerSeasonModal } from '../components/LogPlayerSeasonModal';
import { getSportConfig } from '@dynasty-os/sport-configs';
import type { Player, PlayerStatus } from '@dynasty-os/core-types';

const SPORT_BADGE: Record<string, { label: string; classes: string }> = {
  cfb: { label: 'CFB', classes: 'bg-orange-600 text-orange-100' },
  madden: { label: 'NFL', classes: 'bg-green-700 text-green-100' },
};

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

type StatusFilter = 'active' | 'departed' | 'all';

const DEPARTED_STATUSES: PlayerStatus[] = ['graduated', 'transferred', 'drafted', 'injured', 'other'];

function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

export function RosterPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { players, loading } = usePlayerStore();

  const [addOpen, setAddOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [logSeasonPlayer, setLogSeasonPlayer] = useState<Player | null>(null);
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  useEffect(() => {
    if (!activeDynasty) return;
    usePlayerStore.getState().loadPlayers(activeDynasty.id);
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  const badge = SPORT_BADGE[activeDynasty.sport] ?? {
    label: activeDynasty.sport.toUpperCase(),
    classes: 'bg-gray-600 text-gray-100',
  };

  const sportConfig = getSportConfig(activeDynasty.sport);

  // Filter players
  const filteredPlayers = players.filter((p) => {
    const matchesPosition = positionFilter === 'All' || p.position === positionFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.status === 'active') ||
      (statusFilter === 'departed' && DEPARTED_STATUSES.includes(p.status));
    return matchesPosition && matchesStatus;
  });

  // Sort by position group order then lastName
  const positionOrder = sportConfig.positions;
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const posA = positionOrder.indexOf(a.position);
    const posB = positionOrder.indexOf(b.position);
    if (posA !== posB) return posA - posB;
    return a.lastName.localeCompare(b.lastName);
  });

  async function handleDelete(player: Player) {
    const confirmed = window.confirm(
      `Delete ${player.firstName} ${player.lastName}? This will also delete all their season stats.`
    );
    if (!confirmed) return;
    await usePlayerStore.getState().deletePlayer(player.id);
  }

  function handleRowClick(player: Player) {
    useNavigationStore.getState().goToPlayerProfile(player.id);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useNavigationStore.getState().goToDashboard()}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold tracking-tight truncate max-w-xs">
              {activeDynasty.name}
            </h1>
            <span className={`text-xs font-bold px-2 py-1 rounded ${badge.classes}`}>
              {badge.label}
            </span>
          </div>
          <DynastySwitcher />
        </div>
      </header>

      {/* Sub-header */}
      <div className="border-b border-gray-800 bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Roster</h2>
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Add Player
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Position filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Position</label>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
            >
              <option value="All">All Positions</option>
              {sportConfig.positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              {(['active', 'departed', 'all'] as StatusFilter[]).map((sf) => (
                <button
                  key={sf}
                  onClick={() => setStatusFilter(sf)}
                  className={`px-3 py-1.5 text-sm transition-colors capitalize ${
                    statusFilter === sf
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-end">
            <span className="text-sm text-gray-500">
              {sortedPlayers.length} player{sortedPlayers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && players.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading roster...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && players.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h2 className="text-gray-300 font-semibold text-lg mb-2">No Players Yet</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-6">
              Add your first player to start building your roster.
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Add First Player
            </button>
          </div>
        )}

        {/* No results (filtered) */}
        {!loading && players.length > 0 && sortedPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              No players match the current filters.
            </p>
          </div>
        )}

        {/* Player table */}
        {sortedPlayers.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3 w-12">#</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Pos</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Class</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Stars</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Hometown</th>
                  <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => (
                  <tr
                    key={player.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${
                      idx === sortedPlayers.length - 1 ? 'border-b-0' : ''
                    }`}
                    onClick={() => handleRowClick(player)}
                  >
                    <td className="px-4 py-3 text-gray-400 font-mono">
                      {player.jerseyNumber !== undefined ? player.jerseyNumber : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium hover:text-blue-300 transition-colors">
                        {player.firstName} {player.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 font-medium">{player.position}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {player.classYear ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {player.recruitingStars !== undefined ? (
                        <span className="text-yellow-500 text-xs tracking-tight">
                          {renderStars(player.recruitingStars)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {player.homeCity && player.homeState
                        ? `${player.homeCity}, ${player.homeState}`
                        : player.homeState ?? player.homeCity ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[player.status]}`}
                      >
                        {STATUS_LABEL[player.status]}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {player.status === 'active' && (
                          <button
                            onClick={() => setLogSeasonPlayer(player)}
                            className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
                            aria-label="Log season stats"
                          >
                            Log Season
                          </button>
                        )}
                        <button
                          onClick={() => setEditPlayer(player)}
                          className="text-gray-400 hover:text-gray-200 transition-colors text-xs"
                          aria-label="Edit player"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(player)}
                          className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                          aria-label="Delete player"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddPlayerModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        dynastyId={activeDynasty.id}
        sport={activeDynasty.sport}
      />

      {editPlayer && (
        <EditPlayerModal
          isOpen={editPlayer !== null}
          onClose={() => setEditPlayer(null)}
          player={editPlayer}
          sport={activeDynasty.sport}
        />
      )}

      {logSeasonPlayer && (
        <LogPlayerSeasonModal
          isOpen={logSeasonPlayer !== null}
          onClose={() => setLogSeasonPlayer(null)}
          player={logSeasonPlayer}
          dynastyId={activeDynasty.id}
        />
      )}
    </div>
  );
}
