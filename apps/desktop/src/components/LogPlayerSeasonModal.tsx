import React, { useState, useEffect, useMemo } from 'react';
import type { Player, Season } from '@dynasty-os/core-types';
import { getSportConfig } from '@dynasty-os/sport-configs';
import { useSeasonStore } from '../store/season-store';
import { usePlayerSeasonStore } from '../store/player-season-store';
import { useDynastyStore } from '../store';

interface LogPlayerSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  dynastyId: string;
}

export function LogPlayerSeasonModal({ isOpen, onClose, player, dynastyId }: LogPlayerSeasonModalProps) {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { seasons, activeSeason } = useSeasonStore();
  const loading = usePlayerSeasonStore((s) => s.loading);

  const sportConfig = useMemo(
    () => activeDynasty ? getSportConfig(activeDynasty.sport) : null,
    [activeDynasty?.sport]
  );

  // Season selection
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  // Stat inputs — keyed by stat key
  const [statInputs, setStatInputs] = useState<Record<string, string>>({});

  // Awards (comma-separated text)
  const [awardsText, setAwardsText] = useState('');

  // Overall rating
  const [overallRating, setOverallRating] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');

  // Initialize season selection to activeSeason when modal opens
  useEffect(() => {
    if (isOpen && activeSeason) {
      setSelectedSeasonId(activeSeason.id);
    } else if (isOpen && seasons.length > 0) {
      setSelectedSeasonId(seasons[0].id);
    }
  }, [isOpen, activeSeason, seasons]);

  function resetForm() {
    setStatInputs({});
    setAwardsText('');
    setOverallRating('');
    setNotes('');
    setError('');
    if (activeSeason) {
      setSelectedSeasonId(activeSeason.id);
    } else if (seasons.length > 0) {
      setSelectedSeasonId(seasons[0].id);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const selectedSeason = seasons.find((s: Season) => s.id === selectedSeasonId);

  // Group stat categories by group
  const statGroups = useMemo(() => {
    if (!sportConfig) return [];
    const groupMap: Record<string, typeof sportConfig.statCategories> = {};
    for (const stat of sportConfig.statCategories) {
      if (!groupMap[stat.group]) groupMap[stat.group] = [];
      groupMap[stat.group].push(stat);
    }
    return Object.entries(groupMap);
  }, [sportConfig]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedSeason) {
      setError('Please select a season.');
      return;
    }

    // Build sparse stats object — only include non-zero entered values
    const stats: Record<string, number> = {};
    for (const [key, rawVal] of Object.entries(statInputs)) {
      if (rawVal === '' || rawVal === undefined) continue;
      const num = parseFloat(rawVal);
      if (!isNaN(num) && num !== 0) {
        stats[key] = num;
      }
    }

    // Parse awards
    const awards = awardsText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    try {
      await usePlayerSeasonStore.getState().addPlayerSeason({
        playerId: player.id,
        dynastyId,
        seasonId: selectedSeason.id,
        year: selectedSeason.year,
        stats,
        awards: awards.length > 0 ? awards : undefined,
        overallRating: overallRating !== '' ? parseInt(overallRating, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      resetForm();
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
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold text-lg">
              Log Season Stats
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {player.firstName} {player.lastName} — {player.position}
            </p>
          </div>
          <button
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Season selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Season <span className="text-red-400">*</span>
            </label>
            {seasons.length === 0 ? (
              <p className="text-sm text-yellow-400 bg-yellow-900/30 border border-yellow-800 rounded-lg px-3 py-2">
                No seasons found. Create a season first from the Dashboard.
              </p>
            ) : (
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
              >
                {[...seasons].sort((a, b) => b.year - a.year).map((s: Season) => (
                  <option key={s.id} value={s.id}>
                    {s.year} Season
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stat categories */}
          {sportConfig && statGroups.map(([groupName, stats]) => (
            <div key={groupName}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-700 pb-1">
                {groupName}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <div key={stat.key}>
                    <label className="block text-sm text-gray-400 mb-1">
                      {stat.label}
                      {stat.type === 'decimal' && (
                        <span className="text-xs text-gray-600 ml-1">(decimal)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={stat.type === 'decimal' ? '0.1' : '1'}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                      value={statInputs[stat.key] ?? ''}
                      onChange={(e) =>
                        setStatInputs((prev) => ({ ...prev, [stat.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Awards */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Awards <span className="text-gray-600 text-xs">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. All-American, Heisman Finalist"
              value={awardsText}
              onChange={(e) => setAwardsText(e.target.value)}
            />
          </div>

          {/* Overall Rating */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Overall Rating <span className="text-gray-600 text-xs">(0–99, optional)</span>
            </label>
            <input
              type="number"
              min="0"
              max="99"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. 87"
              value={overallRating}
              onChange={(e) => setOverallRating(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Notes <span className="text-gray-600 text-xs">(optional)</span>
            </label>
            <textarea
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Any notable events, context, or comments..."
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
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || seasons.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Log Season Stats'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
