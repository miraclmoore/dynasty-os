import React, { useEffect, useState } from 'react';
import { db } from '@dynasty-os/db';
import { useDynastyStore } from '../store';
import { useNavigationStore } from '../store/navigation-store';
import type { Season, Player, PlayerSeason } from '@dynasty-os/core-types';

interface SeasonRecord {
  season: Season;
  topPerformer: { name: string; statLine: string } | null;
}

function buildRecordBook(
  seasons: Season[],
  _games: unknown[],
  playerSeasons: PlayerSeason[],
  players: Player[]
): SeasonRecord[] {
  // Sort seasons chronologically (oldest first)
  const sorted = [...seasons].sort((a, b) => a.year - b.year);

  return sorted.map((season) => {
    // Find top performer for this season
    const seasonPlayerSeasons = playerSeasons.filter((ps) => ps.seasonId === season.id);

    let topPerformer: { name: string; statLine: string } | null = null;

    if (seasonPlayerSeasons.length > 0) {
      // Score each player season by summing all stat values
      const scored = seasonPlayerSeasons.map((ps) => {
        const total = Object.values(ps.stats).reduce((sum, v) => sum + v, 0);
        return { ps, total };
      });
      scored.sort((a, b) => b.total - a.total);
      const best = scored[0];
      if (best && best.total > 0) {
        const player = players.find((p) => p.id === best.ps.playerId);
        if (player) {
          const name = `${player.firstName} ${player.lastName}`;
          // Pick the top 2 stat entries for display
          const statEntries = Object.entries(best.ps.stats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2);
          const statLine = statEntries
            .map(([key, val]) => `${val} ${key}`)
            .join(', ');
          topPerformer = { name, statLine };
        }
      }
    }

    return { season, topPerformer };
  });
}

function WLBadge({ wins, losses, label }: { wins: number; losses: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-white">
        {wins}-{losses}
      </span>
    </div>
  );
}

export function RecordBookPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const [records, setRecords] = useState<SeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeDynasty) return;

    async function load() {
      if (!activeDynasty) return;
      setLoading(true);
      try {
        const [seasons, games, playerSeasons, players] = await Promise.all([
          db.seasons.where('dynastyId').equals(activeDynasty.id).sortBy('year'),
          db.games.where('dynastyId').equals(activeDynasty.id).toArray(),
          db.playerSeasons.where('dynastyId').equals(activeDynasty.id).toArray(),
          db.players.where('dynastyId').equals(activeDynasty.id).toArray(),
        ]);
        setRecords(buildRecordBook(seasons, games, playerSeasons, players));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header — no-print hides during window.print() */}
      <header className="border-b border-gray-800 px-6 py-4 no-print">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => useNavigationStore.getState().goToDashboard()}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Record Book</h1>
            <p className="text-sm text-gray-400">
              {activeDynasty.coachName} &mdash; {activeDynasty.teamName} &mdash; Full Dynasty History
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors no-print"
            title="Print record book"
          >
            Print
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Print-only title */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{activeDynasty.teamName} Dynasty Record Book</h1>
          <p className="text-gray-600">{activeDynasty.coachName}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading dynasty history...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-gray-400 text-sm">No seasons logged yet.</p>
              <p className="text-gray-500 text-xs mt-1">
                Log your first season from the Dashboard to start your Record Book.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-800">
            {records.map(({ season, topPerformer }) => {
              const isChampionship =
                season.playoffResult?.toLowerCase().includes('champion') ?? false;

              return (
                <div
                  key={season.id}
                  className="py-4 first:pt-0 last:pb-0"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Year column */}
                    <div className="sm:w-20 flex-shrink-0">
                      <div className="text-2xl font-black text-white">{season.year}</div>
                      {isChampionship && (
                        <div className="text-xs font-bold text-amber-400 mt-0.5">CHAMPION</div>
                      )}
                    </div>

                    {/* Records section */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-6">
                        <WLBadge wins={season.wins} losses={season.losses} label="Overall" />
                        <WLBadge
                          wins={season.confWins}
                          losses={season.confLosses}
                          label="Conference"
                        />
                        {season.finalRanking != null && (
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">
                              Final Rank
                            </span>
                            <span className="text-sm font-semibold text-blue-400">
                              #{season.finalRanking}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bowl / playoff result */}
                      {(season.bowlGame || season.playoffResult) && (
                        <div className="flex flex-wrap gap-3 text-xs">
                          {season.bowlGame && (
                            <span className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-gray-300">
                              {season.bowlGame}
                              {season.bowlResult && (
                                <span
                                  className={`ml-1 font-bold ${
                                    season.bowlResult === 'W' ? 'text-green-400' : 'text-red-400'
                                  }`}
                                >
                                  {season.bowlResult}
                                </span>
                              )}
                            </span>
                          )}
                          {season.playoffResult && (
                            <span
                              className={`border px-2 py-1 rounded text-xs font-medium ${
                                isChampionship
                                  ? 'bg-amber-900/30 border-amber-700 text-amber-300'
                                  : 'bg-gray-800 border-gray-700 text-gray-300'
                              }`}
                            >
                              {season.playoffResult}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Top performer */}
                      {topPerformer && (
                        <div className="text-xs text-gray-500">
                          Top performer:{' '}
                          <span className="text-gray-300 font-medium">{topPerformer.name}</span>
                          {topPerformer.statLine && (
                            <span className="text-gray-500"> &mdash; {topPerformer.statLine}</span>
                          )}
                        </div>
                      )}

                      {/* Season notes / tagline */}
                      {season.tagline && (
                        <div className="text-xs text-amber-400 italic">&ldquo;{season.tagline}&rdquo;</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
