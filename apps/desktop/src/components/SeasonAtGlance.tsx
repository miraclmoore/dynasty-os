import React from 'react';
import type { Season } from '@dynasty-os/core-types';

interface SeasonAtGlanceProps {
  season: Season | null;
}

export function SeasonAtGlance({ season }: SeasonAtGlanceProps) {
  const wins = season?.wins ?? 0;
  const losses = season?.losses ?? 0;
  const confWins = season?.confWins ?? 0;
  const confLosses = season?.confLosses ?? 0;
  const hasGames = wins > 0 || losses > 0;
  const hasConfRecord = confWins > 0 || confLosses > 0;

  return (
    <div className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Season at a Glance
      </h2>

      <div className="flex items-end gap-4">
        <div>
          <div className="text-3xl font-bold text-white">
            {wins}-{losses}
          </div>
          {!hasGames && (
            <div className="text-xs text-gray-500 mt-1">(No games logged yet)</div>
          )}
          {hasConfRecord && (
            <div className="text-sm text-gray-400 mt-1">
              ({confWins}-{confLosses} conf)
            </div>
          )}
        </div>

        {season?.finalRanking != null && (
          <div className="mb-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-bold">
              #{season.finalRanking}
            </span>
          </div>
        )}
      </div>

      {season?.year != null && (
        <div className="mt-3 text-xs text-gray-500">
          {season.year} Season
        </div>
      )}
    </div>
  );
}
