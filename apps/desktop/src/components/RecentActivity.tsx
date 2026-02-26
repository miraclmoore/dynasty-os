import React from 'react';
import type { Game } from '@dynasty-os/core-types';

interface RecentActivityProps {
  games: Game[];
}

const RESULT_BADGE: Record<string, { label: string; classes: string }> = {
  W: { label: 'W', classes: 'bg-green-500 text-white' },
  L: { label: 'L', classes: 'bg-red-500 text-white' },
  T: { label: 'T', classes: 'bg-gray-500 text-white' },
};

export function RecentActivity({ games }: RecentActivityProps) {
  return (
    <div data-tour-id="tour-recent-activity" className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Recent Results
      </h2>

      {games.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No games logged yet — use Log Game to get started.
        </p>
      ) : (
        <ul className="divide-y divide-gray-700/60">
          {games.map((game) => {
            const badge = RESULT_BADGE[game.result] ?? RESULT_BADGE['L'];
            const prefix = game.homeAway === 'away' ? '@' : 'vs';
            const opponentDisplay = game.opponentRanking != null
              ? `#${game.opponentRanking} ${game.opponent}`
              : game.opponent;

            return (
              <li key={game.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {/* Result badge */}
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${badge.classes}`}
                >
                  {badge.label}
                </span>

                {/* Opponent */}
                <div className="flex-1 min-w-0">
                  <span className="text-gray-300 text-sm mr-1">{prefix}</span>
                  <span className="text-gray-100 text-sm font-medium truncate">
                    {opponentDisplay}
                  </span>
                </div>

                {/* Score */}
                <div className="text-sm font-mono text-gray-200 shrink-0">
                  {game.teamScore}-{game.opponentScore}
                </div>

                {/* Week */}
                <div className="text-xs text-gray-400 shrink-0 w-12 text-right">
                  Wk {game.week}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
