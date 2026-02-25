import React, { useState } from 'react';
import type { Game, GameResult, Dynasty, Season } from '@dynasty-os/core-types';
import type { NarrativeTone, SeasonNarrative } from '../lib/narrative-service';
import { generateGameNarrative, getCachedGameNarrative } from '../lib/narrative-service';
import { InlineEditCell } from './InlineEditCell';

interface GameLogProps {
  games: Game[];
  dynasty: Dynasty;
  season: Season;
  activeTone: NarrativeTone;
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

// ── Per-game recap state ──────────────────────────────────────────────────────

interface GameRecapState {
  open: boolean;
  loading: boolean;
  narrative: SeasonNarrative | null;
}

export function GameLog({ games, dynasty, season, activeTone, onUpdateGame }: GameLogProps) {
  const sorted = [...games].sort((a, b) => a.week - b.week);

  // Map of gameId → recap state
  const [recapState, setRecapState] = useState<Record<string, GameRecapState>>({});

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

  const handleRecapToggle = async (game: Game) => {
    const current = recapState[game.id];

    // If already open, close it
    if (current?.open) {
      setRecapState((prev) => ({
        ...prev,
        [game.id]: { ...prev[game.id], open: false },
      }));
      return;
    }

    // If we already have a narrative cached in state, just open
    if (current?.narrative) {
      setRecapState((prev) => ({
        ...prev,
        [game.id]: { ...prev[game.id], open: true },
      }));
      return;
    }

    // Open loading state
    setRecapState((prev) => ({
      ...prev,
      [game.id]: { open: true, loading: true, narrative: null },
    }));

    // Check Dexie cache first
    const cached = await getCachedGameNarrative(dynasty.id, game.id, activeTone);
    if (cached) {
      setRecapState((prev) => ({
        ...prev,
        [game.id]: { open: true, loading: false, narrative: cached },
      }));
      return;
    }

    // Generate fresh
    const narrative = await generateGameNarrative(dynasty, season, game, activeTone);
    setRecapState((prev) => ({
      ...prev,
      [game.id]: { open: true, loading: false, narrative },
    }));
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
              <th className="pb-2 pl-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((game) => {
              const opponentDisplay = [
                game.homeAway === 'away' ? '@' : 'vs',
                game.opponentRanking != null ? `#${game.opponentRanking} ` : '',
                game.opponent,
              ].join(' ');

              const recap = recapState[game.id];
              const isCompleted = game.result === 'W' || game.result === 'L' || game.result === 'T';

              return (
                <React.Fragment key={game.id}>
                  <tr className="hover:bg-gray-800/50 border-b border-gray-700/50 last:border-0">
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
                    <td className="py-2 pl-3">
                      {isCompleted && (
                        <button
                          onClick={() => void handleRecapToggle(game)}
                          title="Game recap"
                          className={`p-1 rounded transition-colors ${
                            recap?.open
                              ? 'text-amber-400 bg-amber-900/30'
                              : 'text-gray-500 hover:text-amber-400 hover:bg-amber-900/20'
                          }`}
                        >
                          {/* Newspaper / recap icon */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Inline recap row */}
                  {recap?.open && (
                    <tr className="border-b border-gray-700/50">
                      <td colSpan={7} className="py-3 px-2">
                        {recap.loading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                            <svg
                              className="animate-spin h-3.5 w-3.5 text-amber-400"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Generating recap...
                          </div>
                        ) : recap.narrative ? (
                          <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/40">
                            {recap.narrative.tagline && (
                              <p className="text-amber-400 text-sm font-semibold mb-2">
                                {recap.narrative.tagline
                                  .split(' ')
                                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                  .join(' ')}
                              </p>
                            )}
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {recap.narrative.recap}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 py-1">
                            Could not generate recap. Check your API key.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
