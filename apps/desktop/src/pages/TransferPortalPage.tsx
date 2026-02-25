import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useTransferPortalStore } from '../store/transfer-portal-store';
import { useNavigationStore } from '../store/navigation-store';
import { calculateNetImpact } from '../lib/transfer-portal-service';
import { useFilterStore } from '../store/filter-store';
import type { Season } from '@dynasty-os/core-types';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C', 'DL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'ATH'];

interface ArrivalFormData {
  playerName: string;
  position: string;
  stars: number;
  originSchool: string;
}

interface DepartureFormData {
  playerName: string;
  position: string;
  destinationSchool: string;
}

const defaultArrivalForm: ArrivalFormData = {
  playerName: '',
  position: 'QB',
  stars: 3,
  originSchool: '',
};

const defaultDepartureForm: DepartureFormData = {
  playerName: '',
  position: 'QB',
  destinationSchool: '',
};

function netImpactColor(score: number): string {
  if (score > 0) return 'text-green-400';
  if (score < 0) return 'text-red-400';
  return 'text-gray-400';
}

export function TransferPortalPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { seasons, activeSeason } = useSeasonStore();
  const { entries, loading, loadEntries, addEntry, removeEntry } = useTransferPortalStore();
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const PAGE_KEY = 'transfer-portal';
  const _savedFilters = useFilterStore.getState().getFilters(PAGE_KEY);
  const _savedSeasonId = _savedFilters['seasonId'] as string | undefined;

  const [selectedSeason, setSelectedSeasonState] = useState<Season | null>(null);
  const setSelectedSeason = (season: Season | null) => {
    setSelectedSeasonState(season);
    useFilterStore.getState().setFilter(PAGE_KEY, 'seasonId', season?.id ?? '');
  };
  const [arrivalForm, setArrivalForm] = useState<ArrivalFormData>(defaultArrivalForm);
  const [departureForm, setDepartureForm] = useState<DepartureFormData>(defaultDepartureForm);

  // Initialize selected season: restore from filter store first, then fall back to activeSeason
  useEffect(() => {
    if (seasons.length === 0) return;
    if (_savedSeasonId) {
      const saved = seasons.find((s) => s.id === _savedSeasonId);
      if (saved) {
        setSelectedSeasonState(saved);
        return;
      }
    }
    if (activeSeason && !selectedSeason) {
      setSelectedSeasonState(activeSeason);
    }
  }, [activeSeason, seasons]);

  // Load entries whenever selected season changes
  useEffect(() => {
    if (selectedSeason) {
      loadEntries(selectedSeason.id);
    }
  }, [selectedSeason?.id]);

  if (!activeDynasty) return null;

  // CFB-only guard
  if (activeDynasty.sport !== 'cfb') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-bold text-gray-200 mb-3">CFB Only Feature</h2>
          <p className="text-gray-400 text-sm mb-6">
            Transfer Portal is only available for College Football dynasties.
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

  const impact = calculateNetImpact(entries);
  const scoreDisplay = impact.netImpactScore > 0
    ? `+${impact.netImpactScore.toFixed(1)}`
    : impact.netImpactScore.toFixed(1);

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const season = seasons.find((s) => s.id === e.target.value) ?? null;
    setSelectedSeason(season); // wrapper persists to filter store
  };

  const handleAddArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDynasty || !selectedSeason) return;
    if (!arrivalForm.playerName.trim()) return;

    await addEntry({
      dynastyId: activeDynasty.id,
      seasonId: selectedSeason.id,
      year: selectedSeason.year,
      type: 'arrival',
      playerName: arrivalForm.playerName.trim(),
      position: arrivalForm.position,
      stars: arrivalForm.stars,
      originSchool: arrivalForm.originSchool.trim() || undefined,
    });

    setArrivalForm(defaultArrivalForm);
  };

  const handleAddDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDynasty || !selectedSeason) return;
    if (!departureForm.playerName.trim()) return;

    await addEntry({
      dynastyId: activeDynasty.id,
      seasonId: selectedSeason.id,
      year: selectedSeason.year,
      type: 'departure',
      playerName: departureForm.playerName.trim(),
      position: departureForm.position,
      destinationSchool: departureForm.destinationSchool.trim() || undefined,
    });

    setDepartureForm(defaultDepartureForm);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToDashboard}
              className="text-gray-400 hover:text-white transition-colors mr-1"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold tracking-tight">Transfer Portal War Room</h1>
            <span className="text-sm text-gray-400">{activeDynasty.teamName}</span>
          </div>

          {/* Season selector */}
          {seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Season</label>
              <select
                value={selectedSeason?.id ?? ''}
                onChange={handleSeasonChange}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.year}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Net Impact Banner */}
        <div className="bg-gray-800 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-black ${netImpactColor(impact.netImpactScore)}`}>
                  {scoreDisplay}
                </span>
                <div>
                  <div className="text-base font-bold text-gray-200">{impact.netImpactLabel}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Net Impact Score</div>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{impact.arrivalStars}</div>
                <div className="text-xs text-gray-400 mt-1">Arrival Stars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-200">{impact.arrivals.length}</div>
                <div className="text-xs text-gray-400 mt-1">Arrivals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{impact.departureCount}</div>
                <div className="text-xs text-gray-400 mt-1">Departures</div>
              </div>
            </div>
          </div>
          {impact.arrivals.length === 0 && impact.departures.length === 0 && (
            <p className="text-xs text-gray-500 mt-3">
              Log arrivals and departures below to calculate your portal impact.
            </p>
          )}
        </div>

        {/* Two-column War Room layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arrivals Column */}
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Arrivals ({impact.arrivals.length})
            </h2>

            {/* Add Arrival Form */}
            <form onSubmit={handleAddArrival} className="flex flex-col gap-2 mb-4">
              <input
                type="text"
                required
                value={arrivalForm.playerName}
                onChange={(e) => setArrivalForm((f) => ({ ...f, playerName: e.target.value }))}
                placeholder="Player Name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={arrivalForm.position}
                  onChange={(e) => setArrivalForm((f) => ({ ...f, position: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                <select
                  value={arrivalForm.stars}
                  onChange={(e) => setArrivalForm((f) => ({ ...f, stars: parseInt(e.target.value, 10) }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  {[5, 4, 3, 2, 1].map((s) => (
                    <option key={s} value={s}>{s} Star</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={arrivalForm.originSchool}
                  onChange={(e) => setArrivalForm((f) => ({ ...f, originSchool: e.target.value }))}
                  placeholder="From School"
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Adding...' : 'Add Arrival'}
              </button>
            </form>

            {/* Arrivals List */}
            {impact.arrivals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No arrivals logged yet.
              </p>
            ) : (
              <div className="space-y-1">
                {impact.arrivals.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-200 truncate block">
                        {entry.playerName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {entry.position}
                        {entry.originSchool ? ` · from ${entry.originSchool}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-2 shrink-0">
                      <span className="text-yellow-400 text-sm">
                        {'★'.repeat(entry.stars ?? 0)}
                        <span className="text-gray-600">{'★'.repeat(5 - (entry.stars ?? 0))}</span>
                      </span>
                      <button
                        onClick={() => removeEntry(entry.id, selectedSeason?.id ?? '')}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        aria-label="Remove arrival"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Departures Column */}
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Departures ({impact.departureCount})
            </h2>

            {/* Add Departure Form */}
            <form onSubmit={handleAddDeparture} className="flex flex-col gap-2 mb-4">
              <input
                type="text"
                required
                value={departureForm.playerName}
                onChange={(e) => setDepartureForm((f) => ({ ...f, playerName: e.target.value }))}
                placeholder="Player Name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={departureForm.position}
                  onChange={(e) => setDepartureForm((f) => ({ ...f, position: e.target.value }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={departureForm.destinationSchool}
                  onChange={(e) => setDepartureForm((f) => ({ ...f, destinationSchool: e.target.value }))}
                  placeholder="To School"
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Adding...' : 'Add Departure'}
              </button>
            </form>

            {/* Departures List */}
            {impact.departures.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No departures logged yet.
              </p>
            ) : (
              <div className="space-y-1">
                {impact.departures.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-200 truncate block">
                        {entry.playerName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {entry.position}
                        {entry.destinationSchool ? ` · to ${entry.destinationSchool}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center ml-2 shrink-0">
                      <button
                        onClick={() => removeEntry(entry.id, selectedSeason?.id ?? '')}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        aria-label="Remove departure"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
