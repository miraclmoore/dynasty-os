import React, { useState, useMemo } from 'react';
import type { SportType, GameType, HomeAway, GameResult } from '@dynasty-os/core-types';
import { useGameStore } from '../store/game-store';
import { useSeasonStore } from '../store/season-store';
import { TeamSelect } from './TeamSelect';

interface LogGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynastyId: string;
  seasonId: string;
  sport: SportType;
}

const GAME_TYPE_LABELS: { value: GameType; label: string }[] = [
  { value: 'regular', label: 'Regular Season' },
  { value: 'conference', label: 'Conference Game' },
  { value: 'bowl', label: 'Bowl Game' },
  { value: 'playoff', label: 'Playoff' },
  { value: 'exhibition', label: 'Exhibition' },
];

const HOME_AWAY_OPTIONS: { value: HomeAway; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'neutral', label: 'Neutral' },
];

function deriveResult(
  teamScore: string,
  opponentScore: string
): GameResult | null {
  const ts = parseInt(teamScore, 10);
  const os = parseInt(opponentScore, 10);
  if (isNaN(ts) || isNaN(os)) return null;
  if (ts > os) return 'W';
  if (ts < os) return 'L';
  return 'T';
}

const RESULT_STYLE: Record<GameResult, string> = {
  W: 'bg-green-600 text-white',
  L: 'bg-red-600 text-white',
  T: 'bg-gray-500 text-white',
};

export function LogGameModal({
  isOpen,
  onClose,
  dynastyId,
  seasonId,
  sport,
}: LogGameModalProps) {
  const logGame = useGameStore((s) => s.logGame);
  const gameLoading = useGameStore((s) => s.loading);
  const games = useGameStore((s) => s.games);

  // Rankings already used by other games this season (prevents duplicates)
  const usedRankings = useMemo(
    () => new Set(games.map((g) => g.opponentRanking).filter((r): r is number => r != null)),
    [games]
  );

  // 5 most recent unique opponents for quick-select chips
  const recentOpponents = useMemo(() => {
    const seen = new Set<string>();
    return [...games]
      .sort((a, b) => b.week - a.week)
      .map((g) => g.opponent)
      .filter((opp) => {
        if (seen.has(opp)) return false;
        seen.add(opp);
        return true;
      })
      .slice(0, 5);
  }, [games]);

  // Next available week (max existing week + 1, or 1 if no games)
  const nextWeek = useMemo(() => {
    if (games.length === 0) return 1;
    return Math.min(20, Math.max(...games.map((g) => g.week)) + 1);
  }, [games]);

  const [week, setWeek] = useState<number>(nextWeek);
  const [opponent, setOpponent] = useState('');
  const [opponentConference, setOpponentConference] = useState('');
  const [homeAway, setHomeAway] = useState<HomeAway>('home');
  const [gameType, setGameType] = useState<GameType>('regular');
  const [teamScore, setTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [opponentRanking, setOpponentRanking] = useState('');
  const [teamRanking, setTeamRanking] = useState('');
  const [overtime, setOvertime] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const result = deriveResult(teamScore, opponentScore);

  const isValid =
    opponent.trim() !== '' &&
    teamScore !== '' &&
    opponentScore !== '' &&
    !isNaN(parseInt(teamScore, 10)) &&
    !isNaN(parseInt(opponentScore, 10)) &&
    week >= 1 &&
    week <= 20;

  function handleTeamSelect(teamName: string, conference: string) {
    setOpponent(teamName);
    setOpponentConference(conference);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValid || result === null) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      await logGame({
        seasonId,
        dynastyId,
        week,
        opponent: opponent.trim(),
        teamScore: parseInt(teamScore, 10),
        opponentScore: parseInt(opponentScore, 10),
        result,
        homeAway,
        gameType,
        overtime,
        opponentRanking: opponentRanking ? parseInt(opponentRanking, 10) : undefined,
        teamRanking: teamRanking ? parseInt(teamRanking, 10) : undefined,
        notes: notes.trim() || undefined,
      });

      // Reload season to reflect updated W/L record
      await useSeasonStore.getState().loadSeasons(dynastyId);

      onClose();
    } catch (err) {
      setError(String(err));
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">Log Game</h2>
          <button
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Row: Week + Home/Away */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Week</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Location</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={homeAway}
                onChange={(e) => setHomeAway(e.target.value as HomeAway)}
              >
                {HOME_AWAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opponent */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Opponent <span className="text-red-400">*</span>
            </label>
            {recentOpponents.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1.5">Recent opponents</label>
                <div className="flex flex-wrap gap-1.5">
                  {recentOpponents.map((opp) => (
                    <button
                      key={opp}
                      type="button"
                      onClick={() => setOpponent(opp)}
                      className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs rounded-full transition-colors border border-gray-600"
                    >
                      {opp}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <TeamSelect
              sport={sport}
              value={opponent}
              onChange={handleTeamSelect}
              placeholder="Search for opponent..."
            />
            {opponentConference && (
              <p className="mt-1 text-xs text-gray-500">
                Conference: <span className="text-gray-300">{opponentConference}</span>
              </p>
            )}
          </div>

          {/* Game Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Game Type</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={gameType}
              onChange={(e) => setGameType(e.target.value as GameType)}
            >
              {GAME_TYPE_LABELS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scores + Result */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Score <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Our score"
                  value={teamScore}
                  onChange={(e) => setTeamScore(e.target.value)}
                />
              </div>
              <span className="text-gray-500 font-bold">-</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Their score"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(e.target.value)}
                />
              </div>
              <div className="w-12 flex items-center justify-center">
                {result ? (
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${RESULT_STYLE[result]}`}
                  >
                    {result}
                  </span>
                ) : (
                  <span className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600" />
                )}
              </div>
            </div>
          </div>

          {/* Opponent Ranking + Overtime */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Opp. Ranking{' '}
                <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={opponentRanking}
                onChange={(e) => setOpponentRanking(e.target.value)}
              >
                <option value="">Unranked</option>
                {Array.from({ length: 25 }, (_, i) => i + 1)
                  .filter((rank) => !usedRankings.has(rank))
                  .map((rank) => (
                    <option key={rank} value={String(rank)}>
                      #{rank}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                  checked={overtime}
                  onChange={(e) => setOvertime(e.target.checked)}
                />
                <span className="text-sm text-gray-300">Overtime</span>
              </label>
            </div>
          </div>

          {/* Your Ranking */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Your Ranking{' '}
                <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={teamRanking}
                onChange={(e) => setTeamRanking(e.target.value)}
              >
                <option value="">Unranked</option>
                {Array.from({ length: 25 }, (_, i) => i + 1).map((rank) => (
                  <option key={rank} value={String(rank)}>
                    #{rank}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Notes <span className="text-gray-600 text-xs">(optional)</span>
            </label>
            <textarea
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
              placeholder="Game notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="flex-1 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || gameLoading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              {gameLoading ? 'Saving...' : 'Log Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
