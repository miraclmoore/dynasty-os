import React, { useEffect, useState, useMemo } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useFutureScheduleStore } from '../store/future-schedule-store';
import { projectBowlEligibility } from '../lib/future-schedule-service';
import { useNavigationStore } from '../store/navigation-store';

const GAME_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular Season' },
  { value: 'conference', label: 'Conference' },
  { value: 'non-conference', label: 'Non-Conference' },
  { value: 'bowl', label: 'Bowl Game' },
  { value: 'playoff', label: 'Playoff' },
] as const;

type GameTypeValue = typeof GAME_TYPE_OPTIONS[number]['value'];

const LOCATION_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'neutral', label: 'Neutral' },
] as const;

type LocationValue = typeof LOCATION_OPTIONS[number]['value'];

function locationToIsHome(location: LocationValue): boolean | undefined {
  if (location === 'home') return true;
  if (location === 'away') return false;
  return undefined; // neutral
}

function isHomeToLocation(isHome: boolean | undefined): LocationValue {
  if (isHome === true) return 'home';
  if (isHome === false) return 'away';
  return 'neutral';
}

export function FutureSchedulePage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason } = useSeasonStore();
  const { games, loading, loadGames, addGame, removeGame } = useFutureScheduleStore();

  // Add game form state
  const [opponent, setOpponent] = useState('');
  const [year, setYear] = useState(() => String((activeSeason?.year ?? new Date().getFullYear()) + 1));
  const [gameType, setGameType] = useState<GameTypeValue>('regular');
  const [location, setLocation] = useState<LocationValue>('home');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (activeDynasty) {
      loadGames(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // Update default year when activeSeason changes
  useEffect(() => {
    if (activeSeason) {
      setYear(String(activeSeason.year + 1));
    }
  }, [activeSeason?.year]);

  const gamesByYear = useMemo(() => {
    const map = new Map<number, typeof games>();
    for (const g of games) {
      if (!map.has(g.year)) map.set(g.year, []);
      map.get(g.year)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [games]);

  const bowlProjection = useMemo(() => {
    if (activeDynasty?.sport !== 'cfb' || games.length === 0) return null;
    return projectBowlEligibility(games, activeSeason?.wins ?? 0);
  }, [games, activeSeason?.wins, activeDynasty?.sport]);

  async function handleAddGame(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!opponent.trim()) {
      setFormError('Opponent name is required.');
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2099) {
      setFormError('Please enter a valid year (2000–2099).');
      return;
    }
    if (!activeDynasty) return;

    await addGame(
      {
        dynastyId: activeDynasty.id,
        year: yearNum,
        opponent: opponent.trim(),
        gameType,
        isHome: locationToIsHome(location),
      },
      activeDynasty.id
    );

    setOpponent('');
    setGameType('regular');
    setLocation('home');
  }

  if (!activeDynasty) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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
            <h1 className="text-xl font-bold tracking-tight">Future Schedule</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Add Game Form */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Schedule a Game
          </h2>
          <form onSubmit={handleAddGame} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Opponent</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. Alabama"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Year</label>
              <input
                type="number"
                min="2000"
                max="2099"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Game Type</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as GameTypeValue)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {GAME_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as LocationValue)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {LOCATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {formError && (
              <p className="col-span-2 md:col-span-4 text-red-400 text-sm">{formError}</p>
            )}
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Add Game
              </button>
            </div>
          </form>
        </div>

        {/* Bowl Eligibility Projection — CFB only */}
        {bowlProjection && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Bowl Eligibility Projection
            </h2>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    bowlProjection.eligible
                      ? 'bg-green-900/60 text-green-300 border border-green-700'
                      : 'bg-amber-900/60 text-amber-300 border border-amber-700'
                  }`}
                >
                  {bowlProjection.eligible
                    ? 'Bowl Eligible'
                    : `Needs ${bowlProjection.winsNeeded} more win${bowlProjection.winsNeeded !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Current Wins</p>
                  <p className="text-white font-semibold">{activeSeason?.wins ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Wins Needed</p>
                  <p className="text-white font-semibold">{bowlProjection.winsNeeded}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Regular Games Remaining</p>
                  <p className="text-white font-semibold">{bowlProjection.regularGamesRemaining}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Games Table */}
        {games.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-500 text-sm text-center py-4">
              No future games scheduled yet. Use the form above to add games.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gamesByYear.map(([yr, yearGames]) => (
              <div key={yr} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {yr} Season
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">
                          Opponent
                        </th>
                        <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">
                          Type
                        </th>
                        <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-2 py-2">
                          Location
                        </th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {yearGames.map((game) => (
                        <tr
                          key={game.id}
                          className="border-b border-gray-700/40 hover:bg-gray-700/20 transition-colors"
                        >
                          <td className="px-2 py-2.5 text-white font-medium">{game.opponent}</td>
                          <td className="px-2 py-2.5 text-gray-400 capitalize">
                            {GAME_TYPE_OPTIONS.find((o) => o.value === game.gameType)?.label ?? game.gameType ?? '—'}
                          </td>
                          <td className="px-2 py-2.5 text-gray-400 capitalize">
                            {isHomeToLocation(game.isHome)
                              .charAt(0)
                              .toUpperCase() + isHomeToLocation(game.isHome).slice(1)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <button
                              onClick={() => removeGame(game.id, activeDynasty.id)}
                              className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                              title="Remove game"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
