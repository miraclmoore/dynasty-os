import React, { useEffect, useState } from 'react';
import { db } from '@dynasty-os/db';
import { useDynastyStore } from '../store';
import { useAchievementStore } from '../store/achievement-store';
import { useNavigationStore } from '../store/navigation-store';
import type { Season } from '@dynasty-os/core-types';

interface CareerStats {
  totalWins: number;
  totalLosses: number;
  winPct: string;
  bowlWins: number;
  bowlLosses: number;
  championships: number;
  seasonsCoached: number;
  totalGames: number;
}

function computeCareerStats(seasons: Season[], gameCount: number): CareerStats {
  const totalWins = seasons.reduce((sum, s) => sum + s.wins, 0);
  const totalLosses = seasons.reduce((sum, s) => sum + s.losses, 0);

  const total = totalWins + totalLosses;
  const winPct = total === 0 ? '0.0%' : ((totalWins / total) * 100).toFixed(1) + '%';

  const bowlSeasons = seasons.filter((s) => s.bowlGame);
  const bowlWins = bowlSeasons.filter((s) => s.bowlResult === 'W').length;
  const bowlLosses = bowlSeasons.filter((s) => s.bowlResult === 'L').length;

  const championships = seasons.filter(
    (s) => s.playoffResult && s.playoffResult.toLowerCase().includes('champion')
  ).length;

  return {
    totalWins,
    totalLosses,
    winPct,
    bowlWins,
    bowlLosses,
    championships,
    seasonsCoached: seasons.length,
    totalGames: gameCount,
  };
}

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function StatCard({ label, value, highlight = false }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-5 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className={`text-3xl font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

export function CoachingResumePage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { achievements, loading: achievementsLoading } = useAchievementStore();
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeDynasty) return;

    // Load achievements in parallel
    useAchievementStore.getState().loadAchievements(activeDynasty.id);

    async function loadStats() {
      if (!activeDynasty) return;
      setLoading(true);
      try {
        const [seasons, games] = await Promise.all([
          db.seasons.where('dynastyId').equals(activeDynasty.id).toArray(),
          db.games.where('dynastyId').equals(activeDynasty.id).toArray(),
        ]);
        setStats(computeCareerStats(seasons, games.length));
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
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
          <div>
            <h1 className="text-xl font-bold tracking-tight">Coaching Resume</h1>
            <p className="text-sm text-gray-400">
              {activeDynasty.coachName} &mdash; {activeDynasty.teamName}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Achievement link bar */}
        <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {achievementsLoading ? (
              'Loading achievements...'
            ) : (
              <span>
                <span className="text-amber-400 font-semibold">{achievements.length}</span> achievements earned
              </span>
            )}
          </div>
          <button
            onClick={() => useNavigationStore.getState().goToTrophyRoom()}
            className="text-sm text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            View Trophy Room
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading career stats...</span>
          </div>
        ) : stats ? (
          <>
            {/* Primary stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Overall Record"
                value={`${stats.totalWins}-${stats.totalLosses}`}
              />
              <StatCard
                label="Win Percentage"
                value={stats.winPct}
                highlight
              />
              <StatCard
                label="Bowl Record"
                value={`${stats.bowlWins}-${stats.bowlLosses}`}
              />
              <StatCard
                label="Championships"
                value={stats.championships}
                highlight
              />
              <StatCard
                label="Seasons Coached"
                value={stats.seasonsCoached}
              />
              <StatCard
                label="Total Games"
                value={stats.totalGames}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">No career data found.</span>
          </div>
        )}
      </main>
    </div>
  );
}
