import React, { useEffect, useState, useMemo } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { usePlayerStore } from '../store/player-store';
import { useDraftStore } from '../store/draft-store';
import { useNavigationStore } from '../store/navigation-store';
import { getPositionBreakdown } from '../lib/draft-service';
import type { DraftPick } from '@dynasty-os/core-types';

const ROUNDS = [1, 2, 3, 4, 5, 6, 7];

interface PickFormData {
  playerName: string;
  position: string;
  round: number;
  pickNumber: string;
  nflTeam: string;
  seasonId: string;
  playerId: string;
}

const defaultPickForm: PickFormData = {
  playerName: '',
  position: '',
  round: 1,
  pickNumber: '',
  nflTeam: '',
  seasonId: '',
  playerId: '',
};

export function DraftTrackerPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { seasons } = useSeasonStore();
  const { players, loadPlayers } = usePlayerStore();
  const { picks, loading, loadPicks, addPick, removePick } = useDraftStore();
  const { goToDashboard, goToPlayerProfile } = useNavigationStore();

  const [form, setForm] = useState<PickFormData>(defaultPickForm);

  // Load picks and players on mount
  useEffect(() => {
    if (activeDynasty) {
      loadPicks(activeDynasty.id);
      loadPlayers(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // Pre-select the latest season in the form when seasons load
  useEffect(() => {
    if (seasons.length > 0 && !form.seasonId) {
      setForm((f) => ({ ...f, seasonId: seasons[0].id }));
    }
  }, [seasons]);

  if (!activeDynasty) return null;

  // CFB-only guard
  if (activeDynasty.sport !== 'cfb') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-bold text-gray-200 mb-3">CFB Only Feature</h2>
          <p className="text-gray-400 text-sm mb-6">
            NFL Draft Tracker is only available for College Football dynasties.
          </p>
          <button
            onClick={goToDashboard}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // When a player is selected from the dropdown, auto-fill playerName and position
  const handlePlayerSelect = (playerId: string) => {
    if (!playerId) {
      setForm((f) => ({ ...f, playerId: '' }));
      return;
    }
    const player = players.find((p) => p.id === playerId);
    if (player) {
      setForm((f) => ({
        ...f,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
      }));
    } else {
      setForm((f) => ({ ...f, playerId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDynasty) return;
    if (!form.playerName.trim() || !form.position.trim() || !form.nflTeam.trim()) return;
    if (!form.seasonId) return;

    const selectedSeason = seasons.find((s) => s.id === form.seasonId);
    if (!selectedSeason) return;

    const pickInput: Omit<DraftPick, 'id' | 'createdAt' | 'updatedAt'> = {
      dynastyId: activeDynasty.id,
      seasonId: form.seasonId,
      year: selectedSeason.year,
      playerName: form.playerName.trim(),
      position: form.position.trim(),
      round: form.round,
      pickNumber: form.pickNumber ? parseInt(form.pickNumber, 10) : undefined,
      nflTeam: form.nflTeam.trim(),
      playerId: form.playerId || undefined,
    };

    await addPick(pickInput, activeDynasty.id);

    // Reset form, keeping the selected season
    setForm((f) => ({
      ...defaultPickForm,
      seasonId: f.seasonId,
    }));
  };

  // Group picks by year, descending
  const picksByYear = useMemo(() => {
    const map = new Map<number, DraftPick[]>();
    for (const pick of picks) {
      const arr = map.get(pick.year) ?? [];
      arr.push(pick);
      map.set(pick.year, arr);
    }
    // Sort each year's picks by round asc, pickNumber asc
    for (const [year, yearPicks] of map.entries()) {
      map.set(
        year,
        [...yearPicks].sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return (a.pickNumber ?? 999) - (b.pickNumber ?? 999);
        })
      );
    }
    // Return sorted entries descending by year
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [picks]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight">NFL Draft Tracker</h1>
          <span className="text-sm text-gray-400">{activeDynasty.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-8">
        {/* Add Draft Pick Form */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-200 mb-4">Log Draft Pick</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Row 1: Player link + auto-fill */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Link to Player (optional)
                </label>
                <select
                  value={form.playerId}
                  onChange={(e) => handlePlayerSelect(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">— No link —</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName} ({player.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Season
                </label>
                <select
                  value={form.seasonId}
                  onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select season...</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Player name + position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  value={form.playerName}
                  onChange={(e) => setForm((f) => ({ ...f, playerName: e.target.value }))}
                  placeholder="e.g. Caleb Williams"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  required
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. QB"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Row 3: Round + pick number + NFL team */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Round
                </label>
                <select
                  value={form.round}
                  onChange={(e) => setForm((f) => ({ ...f, round: parseInt(e.target.value, 10) }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {ROUNDS.map((r) => (
                    <option key={r} value={r}>Round {r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Pick # (optional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={262}
                  value={form.pickNumber}
                  onChange={(e) => setForm((f) => ({ ...f, pickNumber: e.target.value }))}
                  placeholder="e.g. 1"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  NFL Team
                </label>
                <input
                  type="text"
                  required
                  value={form.nflTeam}
                  onChange={(e) => setForm((f) => ({ ...f, nflTeam: e.target.value }))}
                  placeholder="e.g. Chicago Bears"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Log Draft Pick'}
            </button>
          </form>
        </div>

        {/* Historical Draft Classes */}
        <div className="flex flex-col gap-6">
          <h2 className="text-base font-semibold text-gray-300">Draft Class History</h2>

          {picksByYear.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No draft picks logged yet. Use the form above to log picks.
            </div>
          ) : (
            picksByYear.map(([year, yearPicks]) => {
              const breakdown = getPositionBreakdown(yearPicks);

              return (
                <div key={year} className="bg-gray-800 rounded-lg p-5">
                  {/* Year header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-white">{year} NFL Draft</h3>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                      {yearPicks.length} {yearPicks.length === 1 ? 'pick' : 'picks'}
                    </span>
                  </div>

                  {/* Picks table */}
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                          <th className="text-left py-2 pr-4">Round</th>
                          <th className="text-left py-2 pr-4">Pick #</th>
                          <th className="text-left py-2 pr-4">Player</th>
                          <th className="text-left py-2 pr-4">Position</th>
                          <th className="text-left py-2 pr-4">NFL Team</th>
                          <th className="py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearPicks.map((pick) => (
                          <tr
                            key={pick.id}
                            className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="py-2 pr-4 text-gray-300">Rd {pick.round}</td>
                            <td className="py-2 pr-4 text-gray-400">
                              {pick.pickNumber != null ? `#${pick.pickNumber}` : '—'}
                            </td>
                            <td className="py-2 pr-4 font-medium">
                              {pick.playerId ? (
                                <button
                                  onClick={() => goToPlayerProfile(pick.playerId!)}
                                  className="text-blue-400 hover:underline cursor-pointer"
                                >
                                  {pick.playerName}
                                </button>
                              ) : (
                                <span className="text-gray-200">{pick.playerName}</span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-gray-400">{pick.position}</td>
                            <td className="py-2 pr-4 text-gray-400">{pick.nflTeam}</td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => removePick(pick.id, activeDynasty.id)}
                                className="text-gray-600 hover:text-red-400 transition-colors"
                                aria-label="Remove draft pick"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Position breakdown badges */}
                  {Object.keys(breakdown).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(breakdown).map(([group, count]) => (
                        <span
                          key={group}
                          className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
                        >
                          {group}: {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
