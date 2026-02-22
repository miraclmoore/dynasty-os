import React from 'react';
import type { LeaderboardEntry } from '../lib/records-service';
import { useNavigationStore } from '../store/navigation-store';

interface RecordsLeaderboardProps {
  entries: LeaderboardEntry[];
  statLabel: string;
  showYear: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-400 font-bold',   // Gold
  2: 'text-gray-300 font-bold',     // Silver
  3: 'text-amber-600 font-bold',    // Bronze
};

const RANK_ROW_BG: Record<number, string> = {
  1: 'bg-yellow-500/10',
  2: 'bg-gray-500/5',
  3: 'bg-amber-600/5',
};

export function RecordsLeaderboard({ entries, statLabel, showYear }: RecordsLeaderboardProps) {
  const goToPlayerProfile = useNavigationStore((s) => s.goToPlayerProfile);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        No stats logged yet for this category.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700">
            <th className="pb-2 pr-3 w-10">Rank</th>
            <th className="pb-2 pr-3">Player</th>
            <th className="pb-2 pr-3 w-16">Pos</th>
            {showYear && <th className="pb-2 pr-3 w-16">Year</th>}
            <th className="pb-2 text-right">{statLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const rank = index + 1;
            const rankStyle = RANK_STYLES[rank] ?? 'text-gray-500';
            const rowBg = RANK_ROW_BG[rank] ?? '';

            return (
              <tr
                key={`${entry.playerId}-${entry.seasonId ?? 'career'}`}
                className={`border-b border-gray-800 last:border-0 ${rowBg}`}
              >
                <td className={`py-3 pr-3 ${rankStyle}`}>
                  {rank <= 3 ? (
                    <span className="flex items-center gap-1">
                      <span>{rank === 1 ? '1' : rank === 2 ? '2' : '3'}</span>
                    </span>
                  ) : (
                    <span className="text-gray-500">{rank}</span>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <button
                    onClick={() => goToPlayerProfile(entry.playerId)}
                    className="text-blue-400 hover:text-blue-300 hover:underline text-left"
                  >
                    {entry.playerName}
                  </button>
                </td>
                <td className="py-3 pr-3 text-gray-400">{entry.position}</td>
                {showYear && (
                  <td className="py-3 pr-3 text-gray-400">{entry.year ?? '—'}</td>
                )}
                <td className="py-3 text-right text-white font-mono">
                  {typeof entry.value === 'number' && !Number.isInteger(entry.value)
                    ? entry.value.toFixed(1)
                    : entry.value.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
