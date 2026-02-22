import React, { useState } from 'react';
import type { Season } from '@dynasty-os/core-types';
import { useSeasonStore } from '../store/season-store';

interface SeasonEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasonId: string;
  dynastyId: string;
  currentSeason: Season | null;
}

export function SeasonEndModal({
  isOpen,
  onClose,
  seasonId,
  dynastyId,
  currentSeason,
}: SeasonEndModalProps) {
  const updateSeason = useSeasonStore((s) => s.updateSeason);
  const loading = useSeasonStore((s) => s.loading);

  const [finalRanking, setFinalRanking] = useState(
    currentSeason?.finalRanking != null ? String(currentSeason.finalRanking) : ''
  );
  const [bowlGame, setBowlGame] = useState(currentSeason?.bowlGame ?? '');
  const [bowlResult, setBowlResult] = useState<'W' | 'L' | ''>(
    currentSeason?.bowlResult ?? ''
  );
  const [playoffResult, setPlayoffResult] = useState(currentSeason?.playoffResult ?? '');
  const [notes, setNotes] = useState(currentSeason?.notes ?? '');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const rankingNum = finalRanking ? parseInt(finalRanking, 10) : undefined;
    if (finalRanking && (isNaN(rankingNum as number) || (rankingNum as number) < 1 || (rankingNum as number) > 25)) {
      setError('Ranking must be between 1 and 25.');
      return;
    }

    try {
      await updateSeason(seasonId, {
        finalRanking: rankingNum,
        bowlGame: bowlGame.trim() || undefined,
        bowlResult: (bowlGame.trim() && bowlResult) ? bowlResult : undefined,
        playoffResult: playoffResult.trim() || undefined,
        notes: notes.trim() || undefined,
      });
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
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">End of Season</h2>
          <button
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Final Ranking */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Final AP/CFP Ranking{' '}
              <span className="text-gray-600 text-xs">(optional, 1–25)</span>
            </label>
            <input
              type="number"
              min="1"
              max="25"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. 4"
              value={finalRanking}
              onChange={(e) => setFinalRanking(e.target.value)}
            />
          </div>

          {/* Bowl Game */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Bowl Game <span className="text-gray-600 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Rose Bowl"
              value={bowlGame}
              onChange={(e) => setBowlGame(e.target.value)}
            />
          </div>

          {/* Bowl Result — only show when bowl game is entered */}
          {bowlGame.trim() && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bowl Result</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={bowlResult}
                onChange={(e) => setBowlResult(e.target.value as 'W' | 'L' | '')}
              >
                <option value="">N/A</option>
                <option value="W">Win</option>
                <option value="L">Loss</option>
              </select>
            </div>
          )}

          {/* Playoff Result */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Playoff Result <span className="text-gray-600 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. CFP Semifinal"
              value={playoffResult}
              onChange={(e) => setPlayoffResult(e.target.value)}
            />
          </div>

          {/* Season Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Season Notes <span className="text-gray-600 text-xs">(optional)</span>
            </label>
            <textarea
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Memorable moments, storylines..."
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
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Save Season Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
