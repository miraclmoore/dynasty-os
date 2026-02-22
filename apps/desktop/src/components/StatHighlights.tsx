import React from 'react';
import type { Game } from '@dynasty-os/core-types';

interface StatHighlightsProps {
  games: Game[];
}

interface StatCard {
  label: string;
  value: string;
  subtitle?: string;
}

export function StatHighlights({ games }: StatHighlightsProps) {
  if (games.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Stat Highlights
        </h2>
        <p className="text-gray-500 text-sm">Log games to see stat highlights</p>
      </div>
    );
  }

  const totalGames = games.length;
  const totalTeamScore = games.reduce((sum, g) => sum + g.teamScore, 0);
  const totalOppScore = games.reduce((sum, g) => sum + g.opponentScore, 0);

  const ppg = totalTeamScore / totalGames;
  const oppPpg = totalOppScore / totalGames;
  const margin = ppg - oppPpg;

  const highestScoreGame = games.reduce((best, g) => (g.teamScore > best.teamScore ? g : best), games[0]);

  const biggestWinGame = games.reduce((best, g) => {
    const diff = g.teamScore - g.opponentScore;
    const bestDiff = best.teamScore - best.opponentScore;
    return diff > bestDiff ? g : best;
  }, games[0]);

  const otGames = games.filter((g) => g.overtime).length;

  const stats: StatCard[] = [
    {
      label: 'Points Per Game',
      value: ppg.toFixed(1),
    },
    {
      label: 'Opp PPG',
      value: oppPpg.toFixed(1),
    },
    {
      label: 'Scoring Margin',
      value: `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}`,
    },
    {
      label: 'Highest Score',
      value: String(highestScoreGame.teamScore),
      subtitle: `vs ${highestScoreGame.opponent}`,
    },
    {
      label: 'Biggest Win',
      value: `+${Math.max(0, biggestWinGame.teamScore - biggestWinGame.opponentScore)}`,
      subtitle: `vs ${biggestWinGame.opponent}`,
    },
    {
      label: 'Overtime Games',
      value: String(otGames),
    },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Stat Highlights
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            {stat.subtitle && (
              <div className="text-xs text-gray-500 mt-0.5 truncate">{stat.subtitle}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
