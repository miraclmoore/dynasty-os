import React, { useState } from 'react';
import type { HeadToHeadRecord } from '../lib/records-service';

interface HeadToHeadRecordsProps {
  records: HeadToHeadRecord[];
}

function rowTintClass(record: HeadToHeadRecord): string {
  if (record.totalGames === 0) return '';
  if (record.winPct >= 75) return 'bg-green-500/5';
  if (record.winPct < 25) return 'bg-red-500/5';
  return '';
}

function streakColor(type: 'W' | 'L' | 'T'): string {
  if (type === 'W') return 'text-green-400';
  if (type === 'L') return 'text-red-400';
  return 'text-gray-400';
}

export function HeadToHeadRecords({ records }: HeadToHeadRecordsProps) {
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set());

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        No games logged yet.
      </div>
    );
  }

  function toggleExpand(opponent: string) {
    setExpandedOpponents((prev) => {
      const next = new Set(prev);
      if (next.has(opponent)) {
        next.delete(opponent);
      } else {
        next.add(opponent);
      }
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700">
            <th className="pb-2 pr-3 w-6"></th>
            <th className="pb-2 pr-3">Opponent</th>
            <th className="pb-2 pr-3 text-center w-24">Record</th>
            <th className="pb-2 pr-3 text-center w-16">Win%</th>
            <th className="pb-2 pr-3 text-center w-20">Streak</th>
            <th className="pb-2 text-center w-20">Games</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const isExpanded = expandedOpponents.has(record.opponent);
            const tint = rowTintClass(record);
            const recordStr = record.ties > 0
              ? `${record.wins}-${record.losses}-${record.ties}`
              : `${record.wins}-${record.losses}`;

            return (
              <React.Fragment key={record.opponent}>
                <tr
                  className={`border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 ${tint}`}
                  onClick={() => toggleExpand(record.opponent)}
                >
                  <td className="py-3 pr-2 text-gray-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                  </td>
                  <td className="py-3 pr-3 text-white">{record.opponent}</td>
                  <td className="py-3 pr-3 text-center font-mono text-gray-200">{recordStr}</td>
                  <td className="py-3 pr-3 text-center text-gray-300">
                    {record.winPct.toFixed(1)}%
                  </td>
                  <td className={`py-3 pr-3 text-center font-semibold ${streakColor(record.currentStreak.type)}`}>
                    {record.currentStreak.type}{record.currentStreak.count}
                  </td>
                  <td className="py-3 text-center text-gray-400">{record.totalGames}</td>
                </tr>

                {isExpanded && (
                  <tr className={`border-b border-gray-800 ${tint}`}>
                    <td colSpan={6} className="pb-3 pt-1 px-6">
                      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500 uppercase tracking-wider border-b border-gray-700">
                              <th className="px-3 py-2">Year</th>
                              <th className="px-3 py-2">Week</th>
                              <th className="px-3 py-2">Result</th>
                              <th className="px-3 py-2">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {record.games.map((g, i) => (
                              <tr key={i} className="border-b border-gray-700/50 last:border-0">
                                <td className="px-3 py-1.5 text-gray-400">{g.year}</td>
                                <td className="px-3 py-1.5 text-gray-400">Wk {g.week}</td>
                                <td className={`px-3 py-1.5 font-semibold ${
                                  g.result === 'W' ? 'text-green-400' :
                                  g.result === 'L' ? 'text-red-400' :
                                  'text-gray-400'
                                }`}>
                                  {g.result}
                                </td>
                                <td className="px-3 py-1.5 font-mono text-gray-300">{g.score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
