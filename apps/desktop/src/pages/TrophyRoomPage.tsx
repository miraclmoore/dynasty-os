import React, { useEffect } from 'react';
import { useDynastyStore } from '../store';
import { useAchievementStore } from '../store/achievement-store';
import { useNavigationStore } from '../store/navigation-store';
import { MILESTONE_DEFINITIONS } from '@dynasty-os/core-types';

const CATEGORY_LABELS: Record<string, string> = {
  wins: 'Win Milestones',
  'bowl-wins': 'Bowl Wins',
  championships: 'Championships',
};

const CATEGORY_ORDER = ['wins', 'bowl-wins', 'championships'];

function formatUnlockDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function TrophyRoomPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { achievements, loading } = useAchievementStore();

  useEffect(() => {
    if (!activeDynasty) return;
    useAchievementStore.getState().loadAchievements(activeDynasty.id);
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  // Build a Set of earned achievement IDs for O(1) lookup
  const earnedMap = new Map(achievements.map((a) => [a.achievementId, a]));

  const totalEarned = achievements.length;
  const totalDefined = MILESTONE_DEFINITIONS.length;

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
            <h1 className="text-xl font-bold tracking-tight">Trophy Room</h1>
            <p className="text-sm text-gray-400">{activeDynasty.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-8">
        {/* Summary bar */}
        <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
          <span className="text-amber-400 text-2xl font-bold">★</span>
          <div>
            <span className="text-white font-semibold text-lg">{totalEarned}</span>
            <span className="text-gray-400 text-sm"> / {totalDefined} achievements earned</span>
          </div>
          {loading && (
            <span className="ml-auto text-xs text-gray-500">Loading...</span>
          )}
        </div>

        {/* Category sections */}
        {CATEGORY_ORDER.map((category) => {
          const defs = MILESTONE_DEFINITIONS.filter((d) => d.category === category);

          return (
            <div key={category}>
              <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3 font-semibold">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="flex flex-col gap-3">
                {defs.map((def) => {
                  const earned = earnedMap.get(def.achievementId);
                  const isEarned = Boolean(earned);

                  return (
                    <div
                      key={def.achievementId}
                      className={`rounded-lg p-4 border ${
                        isEarned
                          ? 'bg-gray-800 border-amber-600'
                          : 'bg-gray-800 border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xl leading-none ${
                              isEarned ? 'text-amber-400' : 'text-gray-600'
                            }`}
                          >
                            {isEarned ? '★' : '○'}
                          </span>
                          <div>
                            <div
                              className={`font-semibold text-sm ${
                                isEarned ? 'text-white' : 'text-gray-500'
                              }`}
                            >
                              {def.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{def.description}</div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isEarned && earned ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-green-800 text-green-300">
                                Unlocked
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatUnlockDate(earned.unlockedAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-700 text-gray-500">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
