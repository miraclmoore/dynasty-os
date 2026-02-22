import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useGameStore } from '../store/game-store';
import { useNavigationStore } from '../store/navigation-store';
import { DynastySwitcher } from '../components/DynastySwitcher';
import { SeasonAtGlance } from '../components/SeasonAtGlance';
import { RecentActivity } from '../components/RecentActivity';
import { WeeklySnapshot } from '../components/WeeklySnapshot';
import { LogGameModal } from '../components/LogGameModal';
import { SeasonEndModal } from '../components/SeasonEndModal';
import { StatHighlights } from '../components/StatHighlights';
import { GameLog } from '../components/GameLog';
import type { GameResult } from '@dynasty-os/core-types';

const SPORT_BADGE: Record<string, { label: string; classes: string }> = {
  cfb: { label: 'CFB', classes: 'bg-orange-600 text-orange-100' },
  madden: { label: 'NFL', classes: 'bg-green-700 text-green-100' },
};

export function DashboardPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { seasons, activeSeason, loading: seasonLoading } = useSeasonStore();
  const { games, loading: gameLoading } = useGameStore();

  const [logGameOpen, setLogGameOpen] = useState(false);
  const [seasonEndOpen, setSeasonEndOpen] = useState(false);

  // Load seasons on mount / dynasty change
  useEffect(() => {
    if (!activeDynasty) return;

    useSeasonStore.getState().loadSeasons(activeDynasty.id);
  }, [activeDynasty?.id]);

  // Load games when activeSeason is set
  useEffect(() => {
    if (!activeSeason) return;
    useGameStore.getState().loadGames(activeSeason.id);
  }, [activeSeason?.id]);

  if (!activeDynasty) {
    return null;
  }

  const badge = SPORT_BADGE[activeDynasty.sport] ?? {
    label: activeDynasty.sport.toUpperCase(),
    classes: 'bg-gray-600 text-gray-100',
  };

  const handleCreateFirstSeason = async () => {
    await useSeasonStore.getState().createSeason(activeDynasty.id, activeDynasty.currentYear);
  };

  // Last 5 games sorted by week descending for RecentActivity
  const recentGames = [...games].sort((a, b) => b.week - a.week).slice(0, 5);

  const handleGameUpdate = async (
    id: string,
    updates: { teamScore?: number; opponentScore?: number; result?: GameResult; notes?: string }
  ) => {
    await useGameStore.getState().updateGame(id, updates);
    if (activeDynasty) await useSeasonStore.getState().loadSeasons(activeDynasty.id);
    if (activeSeason) await useGameStore.getState().loadGames(activeSeason.id);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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

      {/* Dynasty summary bar */}
      <div className="border-b border-gray-800 bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex gap-8 text-sm">
          <div>
            <span className="text-gray-500">Team </span>
            <span className="text-gray-200">{activeDynasty.teamName}</span>
          </div>
          <div>
            <span className="text-gray-500">Coach </span>
            <span className="text-gray-200">{activeDynasty.coachName}</span>
          </div>
          <div>
            <span className="text-gray-500">Year </span>
            <span className="text-gray-200">{activeDynasty.currentYear}</span>
          </div>
          <div>
            <span className="text-gray-500">Game </span>
            <span className="text-gray-200">{activeDynasty.gameVersion}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {seasonLoading && !activeSeason && (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading season data...</span>
          </div>
        )}

        {!seasonLoading && seasons.length === 0 && (
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="text-gray-300 font-semibold text-lg mb-2">Start Your First Season</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-6">
              Track your {activeDynasty.currentYear} season — record every game, watch your
              ranking move, and build your dynasty story.
            </p>
            <button
              onClick={handleCreateFirstSeason}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Start {activeDynasty.currentYear} Season
            </button>
          </div>
        )}

        {activeSeason && (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <SeasonAtGlance season={activeSeason} />
              <RecentActivity games={recentGames} />
            </div>

            {/* Right column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <WeeklySnapshot season={activeSeason} games={games} />
              <StatHighlights games={games} />

              {/* Action buttons */}
              <div className="bg-gray-800 rounded-lg p-5 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Actions
                </h3>
                <button
                  onClick={() => setLogGameOpen(true)}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Log Game
                </button>
                <button
                  onClick={() => setSeasonEndOpen(true)}
                  className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  End Season
                </button>
                <button
                  onClick={() => useNavigationStore.getState().goToRoster()}
                  className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Manage Roster
                </button>
              </div>

              {/* Modals */}
              <LogGameModal
                isOpen={logGameOpen}
                onClose={async () => {
                  setLogGameOpen(false);
                  if (activeDynasty && activeSeason) {
                    await useSeasonStore.getState().loadSeasons(activeDynasty.id);
                    await useGameStore.getState().loadGames(activeSeason.id);
                  }
                }}
                dynastyId={activeDynasty.id}
                seasonId={activeSeason.id}
                sport={activeDynasty.sport}
              />
              <SeasonEndModal
                isOpen={seasonEndOpen}
                onClose={async () => {
                  setSeasonEndOpen(false);
                  if (activeDynasty) {
                    await useSeasonStore.getState().loadSeasons(activeDynasty.id);
                  }
                }}
                seasonId={activeSeason.id}
                dynastyId={activeDynasty.id}
                currentSeason={activeSeason}
              />
            </div>
          </div>
          <div className="mt-6">
            <GameLog games={games} onUpdateGame={handleGameUpdate} />
          </div>
          </>
        )}
      </main>
    </div>
  );
}
