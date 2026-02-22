import React from 'react';
import { useDynastyStore } from '../store';
import { DynastySwitcher } from '../components/DynastySwitcher';

const SPORT_BADGE: Record<string, { label: string; classes: string }> = {
  cfb: { label: 'CFB', classes: 'bg-orange-600 text-orange-100' },
  madden: { label: 'NFL', classes: 'bg-green-700 text-green-100' },
};

export function DashboardPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);

  if (!activeDynasty) {
    return null;
  }

  const badge = SPORT_BADGE[activeDynasty.sport] ?? {
    label: activeDynasty.sport.toUpperCase(),
    classes: 'bg-gray-600 text-gray-100',
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-8 text-sm">
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

      {/* Placeholder content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="text-gray-300 font-semibold text-lg mb-2">Dashboard coming in Phase 2</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Season tracking, game logs, player stats, and narrative generation will be built in
            Phase 2 and beyond.
          </p>
        </div>
      </main>
    </div>
  );
}
