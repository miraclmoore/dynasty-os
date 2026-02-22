import React from 'react';
import type { Game, GameResult } from '@dynasty-os/core-types';
import { InlineEditCell } from './InlineEditCell';

interface GameLogProps {
  games: Game[];
  onUpdateGame: (
    id: string,
    updates: {
      teamScore?: number;
      opponentScore?: number;
      result?: GameResult;
      notes?: string;
    }
  ) => Promise<void>;
}

function deriveResult(teamScore: number, opponentScore: number): GameResult {
  if (teamScore > opponentScore) return 'W';
  if (teamScore < opponentScore) return 'L';
  return 'T';
}

const RESULT_CLASSES: Record<GameResult, string> = {
  W: 'bg-green-700/40 text-green-300 border border-green-700',
  L: 'bg-red-700/40 text-red-300 border border-red-700',
  T: 'bg-gray-700/40 text-gray-300 border border-gray-700',
};

const GAME_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular',
  conference: 'Conf',
  bowl: 'Bowl',
  playoff: 'Playoff',
  exhibition: 'Exhibition',
};

export function GameLog({ games, onUpdateGame }: GameLogProps) {
  const sorted = [...games].sort((a, b) => a.week - b.week);

  if (sorted.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Game Log
        </h2>
        <p className="text-gray-500 text-sm">No games logged yet</p>
      </div>
    );
  }

  const handleTeamScoreEdit = (game: Game, newValue: string) => {
    const newScore = parseInt(newValue, 10);
    if (isNaN(newScore) || newScore < 0) return;
    const newResult = deriveResult(newScore, game.opponentScore);
    void onUpdateGame(game.id, { teamScore: newScore, result: newResult });
  };

  const handleOpponentScoreEdit = (game: Game, newValue: string) => {
    const newScore = parseInt(newValue, 10);
    if (isNaN(newScore) || newScore < 0) return;
    const newResult = deriveResult(game.teamScore, newScore);
    void onUpdateGame(game.id, { opponentScore: newScore, result: newResult });
  };

  const handleNotesEdit = (game: Game, newValue: string) => {
    void onUpdateGame(game.id, { notes: newValue });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Game Log
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-700">
              <th className="pb-2 pr-4 font-semibold tracking-wider">Wk</th>
              <th className="pb-2 pr-4 font-semibold tracking-wider">Result</th>
              <th className="pb-2 pr-4 font-semibold tracking-wider">Opponent</th>
              <th className="pb-2 pr-4 font-semibold tracking-wider">Score</th>
              <th className="pb-2 pr-4 font-semibold tracking-wider">Type</th>
              <th className="pb-2 font-semibold tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((game) => {
              const opponentDisplay = [
                game.homeAway === 'away' ? '@' : game.homeAway === 'neutral' ? 'vs' : 'vs',
                game.opponentRanking != null ? `#${game.opponentRanking} ` : '',
                game.opponent,
              ].join(' ');

              return (
                <tr
                  key={game.id}
                  className="hover:bg-gray-800/50 border-b border-gray-700/50 last:border-0"
                >
                  <td className="py-2 pr-4 text-sm text-gray-200">{game.week}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${RESULT_CLASSES[game.result]}`}
                    >
                      {game.result}
                      {game.overtime ? ' OT' : ''}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-200 whitespace-nowrap">
                    {opponentDisplay}
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-200">
                    <span className="inline-flex items-center gap-0.5">
                      <InlineEditCell
                        value={game.teamScore}
                        onSave={(v) => handleTeamScoreEdit(game, v)}
                        type="number"
                      />
                      <span className="text-gray-500">-</span>
                      <InlineEditCell
                        value={game.opponentScore}
                        onSave={(v) => handleOpponentScoreEdit(game, v)}
                        type="number"
                      />
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-400">
                    {GAME_TYPE_LABELS[game.gameType] ?? game.gameType}
                  </td>
                  <td className="py-2 text-sm text-gray-400 max-w-[160px]">
                    <InlineEditCell
                      value={game.notes ?? '—'}
                      onSave={(v) => handleNotesEdit(game, v)}
                      type="text"
                      className="truncate block max-w-[160px]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
