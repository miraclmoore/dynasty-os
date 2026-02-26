import React from 'react';
import type { Season, Game } from '@dynasty-os/core-types';

interface WeeklySnapshotProps {
  season: Season | null;
  games: Game[];
}

export function WeeklySnapshot({ season, games }: WeeklySnapshotProps) {
  // Determine current week
  const maxWeekPlayed = games.length > 0 ? Math.max(...games.map((g) => g.week)) : 0;
  const currentWeek = maxWeekPlayed + 1;

  // Last game played (highest week)
  const lastGame = games.length > 0
    ? games.reduce((prev, curr) => (curr.week > prev.week ? curr : prev))
    : null;

  // Upcoming opponent: game scheduled for current week
  const upcomingGame = games.find((g) => g.week === currentWeek) ?? null;

  const wins = season?.wins ?? 0;
  const losses = season?.losses ?? 0;

  // Derive current ranking from per-game teamRanking data
  const gamesWithRanking = [...games]
    .filter((g) => g.teamRanking != null)
    .sort((a, b) => b.week - a.week);

  const currentRanking: number | undefined =
    gamesWithRanking.length > 0 ? gamesWithRanking[0].teamRanking : undefined;

  const previousRanking: number | undefined =
    gamesWithRanking.length > 1 ? gamesWithRanking[1].teamRanking : undefined;

  const rankingDelta: number | undefined =
    currentRanking != null && previousRanking != null
      ? previousRanking - currentRanking
      : undefined;

  // Effective ranking to display — per-game data takes precedence over season.finalRanking
  const displayRanking: number | undefined =
    currentRanking ?? season?.finalRanking ?? undefined;

  return (
    <div data-tour-id="tour-weekly-snapshot" className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        This Week
      </h2>

      {/* Current week */}
      <div className="text-2xl font-bold text-white mb-1">Week {currentWeek}</div>

      {/* Record */}
      <div className="text-sm text-gray-200 mb-3">
        Record:{' '}
        <span className="font-semibold text-white">
          {wins}-{losses}
        </span>
      </div>

      {/* Ranking with movement delta */}
      {displayRanking != null && (
        <div className="text-sm text-gray-300 mb-3">
          Ranking:{' '}
          <span className="text-amber-400 font-semibold">#{displayRanking}</span>
          {rankingDelta != null && rankingDelta !== 0 && (
            <span
              className={
                rankingDelta > 0
                  ? 'text-green-400 font-semibold ml-1'
                  : 'text-red-400 font-semibold ml-1'
              }
            >
              ({rankingDelta > 0 ? '+' : ''}{rankingDelta})
            </span>
          )}
        </div>
      )}

      {/* Last game result */}
      {lastGame != null && (
        <div className="text-sm text-gray-300 mb-3">
          Last:{' '}
          <span
            className={
              lastGame.result === 'W'
                ? 'text-green-400 font-semibold'
                : lastGame.result === 'L'
                ? 'text-red-400 font-semibold'
                : 'text-gray-300 font-semibold'
            }
          >
            {lastGame.result}
          </span>{' '}
          <span className="text-gray-300">
            {lastGame.homeAway === 'away' ? '@' : 'vs'} {lastGame.opponent}{' '}
            {lastGame.teamScore}-{lastGame.opponentScore}
          </span>
        </div>
      )}

      {/* Upcoming opponent */}
      <div className="text-sm text-gray-300">
        Next:{' '}
        {upcomingGame != null ? (
          <span className="text-gray-200">
            {upcomingGame.homeAway === 'away' ? '@' : 'vs'} {upcomingGame.opponent}
          </span>
        ) : (
          <span className="text-gray-500">Opponent TBD</span>
        )}
      </div>
    </div>
  );
}
