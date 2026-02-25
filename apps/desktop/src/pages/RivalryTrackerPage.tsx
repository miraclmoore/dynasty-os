import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useRivalryStore } from '../store/rivalry-store';
import { useNavigationStore } from '../store/navigation-store';
import {
  calculateRivalryIntensity,
  calculateSeriesMomentum,
  getKeyMoments,
  addKeyMoment,
  deleteKeyMoment,
} from '../lib/rivalry-service';
import type { KeyMoment } from '../lib/rivalry-service';
import { getHeadToHeadRecords } from '../lib/records-service';
import type { HeadToHeadRecord } from '../lib/records-service';
import type { Rival } from '@dynasty-os/core-types';

interface RivalFormState {
  opponent: string;
  label: string;
}

interface MomentFormState {
  year: string;
  description: string;
}

export function RivalryTrackerPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { rivals, loading, loadRivals, addRival, editRival, removeRival } = useRivalryStore();
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const [h2hRecords, setH2hRecords] = useState<HeadToHeadRecord[]>([]);
  const [rivalForm, setRivalForm] = useState<RivalFormState>({ opponent: '', label: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Key moments state per rival (rivalId -> moments)
  const [keyMomentsMap, setKeyMomentsMap] = useState<Record<string, KeyMoment[]>>({});
  const [momentForms, setMomentForms] = useState<Record<string, MomentFormState>>({});

  useEffect(() => {
    if (!activeDynasty) return;
    loadRivals(activeDynasty.id);
    getHeadToHeadRecords(activeDynasty.id).then(setH2hRecords);
  }, [activeDynasty?.id]);

  // Load key moments whenever rivals change
  useEffect(() => {
    const map: Record<string, KeyMoment[]> = {};
    rivals.forEach((r) => {
      map[r.id] = getKeyMoments(r.id);
    });
    setKeyMomentsMap(map);
  }, [rivals]);

  if (!activeDynasty) return null;

  const handleAddRival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rivalForm.opponent.trim()) return;

    // Check for duplicate
    const alreadyTracked = rivals.some(
      (r) => r.opponent.toLowerCase() === rivalForm.opponent.trim().toLowerCase()
    );
    if (alreadyTracked) {
      setFormError(`"${rivalForm.opponent.trim()}" is already tracked as a rival.`);
      return;
    }

    setFormError(null);
    await addRival(
      {
        dynastyId: activeDynasty.id,
        opponent: rivalForm.opponent.trim(),
        label: rivalForm.label.trim(),
      },
      activeDynasty.id
    );
    setRivalForm({ opponent: '', label: '' });
  };

  const handleStartEdit = (rival: Rival) => {
    setEditingId(rival.id);
    setEditLabel(rival.label);
  };

  const handleSaveEdit = async (rival: Rival) => {
    await editRival(rival.id, { label: editLabel.trim() }, activeDynasty.id);
    setEditingId(null);
    setEditLabel('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const getH2HForRival = (rival: Rival): HeadToHeadRecord | undefined => {
    return h2hRecords.find(
      (r) => r.opponent.toLowerCase() === rival.opponent.toLowerCase()
    );
  };

  const getMomentForm = (rivalId: string): MomentFormState =>
    momentForms[rivalId] ?? { year: '', description: '' };

  const setMomentForm = (rivalId: string, form: MomentFormState) => {
    setMomentForms((prev) => ({ ...prev, [rivalId]: form }));
  };

  const handleAddMoment = (rivalId: string) => {
    const form = getMomentForm(rivalId);
    const year = parseInt(form.year, 10);
    if (!year || !form.description.trim()) return;
    addKeyMoment(rivalId, { year, description: form.description.trim() });
    setKeyMomentsMap((prev) => ({ ...prev, [rivalId]: getKeyMoments(rivalId) }));
    setMomentForm(rivalId, { year: '', description: '' });
  };

  const handleDeleteMoment = (rivalId: string, moment: KeyMoment) => {
    deleteKeyMoment(rivalId, moment.year, moment.description);
    setKeyMomentsMap((prev) => ({ ...prev, [rivalId]: getKeyMoments(rivalId) }));
  };

  const getMomentumLabel = (score: number): string => {
    if (score > 0.1) return 'Momentum: You';
    if (score < -0.1) return 'Momentum: Opponent';
    return 'Even';
  };

  const getMomentumColor = (score: number): string => {
    if (score > 0.1) return 'bg-green-500';
    if (score < -0.1) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getMomentumTextColor = (score: number): string => {
    if (score > 0.1) return 'text-green-400';
    if (score < -0.1) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Rivalry Tracker</h1>
          <span className="text-sm text-gray-400">{activeDynasty.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* Add Rival Form */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-200 mb-4">Add Rival</h2>
          <form onSubmit={handleAddRival} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Opponent Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rivalForm.opponent}
                  onChange={(e) => {
                    setRivalForm((f) => ({ ...f, opponent: e.target.value }));
                    setFormError(null);
                  }}
                  placeholder="e.g. Alabama"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must match opponent name in game log exactly
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Rivalry Label <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={rivalForm.label}
                  onChange={(e) => setRivalForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. The Iron Bowl"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
            <button
              type="submit"
              disabled={loading || !rivalForm.opponent.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Adding...' : 'Add Rival'}
            </button>
          </form>
        </div>

        {/* Rivals List */}
        {rivals.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">
              No rivals tracked yet. Designate your first rival above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Tracked Rivalries ({rivals.length})
            </h2>
            {rivals.map((rival) => {
              const record = getH2HForRival(rival);
              const totalGames = record?.totalGames ?? 0;
              const intensity = calculateRivalryIntensity(totalGames);
              const wins = record?.wins ?? 0;
              const losses = record?.losses ?? 0;
              const winPct = record?.winPct ?? 0;
              const streak = record?.currentStreak;
              const recentGames = record?.games?.slice(0, 3) ?? [];

              // Momentum: computed from all H2H games (sorted by recency already)
              // Cast result string to union type — records-service guarantees only W/L/T values
              const allGames = (record?.games ?? []) as Array<{ result: 'W' | 'L' | 'T'; week?: number }>;
              const momentum = calculateSeriesMomentum(allGames);
              const momentumPct = ((momentum + 1) / 2) * 100; // normalize -1..+1 to 0..100%
              const moments = keyMomentsMap[rival.id] ?? [];
              const momentForm = getMomentForm(rival.id);

              return (
                <div key={rival.id} className="bg-gray-800 rounded-lg p-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {editingId === rival.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-500"
                            placeholder="Rivalry label"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(rival)}
                            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-xs text-gray-500 hover:text-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {rival.label ? (
                            <span className="font-semibold text-amber-400">{rival.label}</span>
                          ) : null}
                          <span className="text-gray-300 font-medium">
                            {rival.label ? `(${rival.opponent})` : rival.opponent}
                          </span>
                          <button
                            onClick={() => handleStartEdit(rival)}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            Edit Label
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeRival(rival.id, activeDynasty.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                      aria-label={`Remove ${rival.opponent} as rival`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {totalGames === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No games logged vs {rival.opponent} yet. Make sure opponent name matches game log exactly.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* H2H Record Row */}
                      <div className="flex items-center gap-6 flex-wrap">
                        {/* W-L Record */}
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Record</div>
                          <div
                            className={`text-2xl font-bold ${winPct >= 50 ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {wins}-{losses}{record && record.ties > 0 ? `-${record.ties}` : ''}
                          </div>
                        </div>

                        {/* Streak */}
                        {streak && (
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Streak</div>
                            <div
                              className={`text-lg font-bold ${
                                streak.type === 'W'
                                  ? 'text-green-400'
                                  : streak.type === 'L'
                                  ? 'text-red-400'
                                  : 'text-gray-400'
                              }`}
                            >
                              {streak.type}{streak.count}
                            </div>
                          </div>
                        )}

                        {/* Intensity */}
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                            Intensity
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-amber-400">
                              {intensity}/10
                            </span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-3 rounded-sm ${
                                    i < intensity ? 'bg-amber-500' : 'bg-gray-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Total Games */}
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Games</div>
                          <div className="text-sm font-medium text-gray-300">{totalGames}</div>
                        </div>
                      </div>

                      {/* Series Momentum */}
                      {allGames.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                            Series Momentum
                            <span className="text-gray-600 normal-case font-normal ml-1">(last 5 games)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Bar */}
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getMomentumColor(momentum)}`}
                                style={{ width: `${momentumPct}%` }}
                              />
                            </div>
                            {/* Score + label */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-sm font-bold ${getMomentumTextColor(momentum)}`}>
                                {momentum > 0 ? '+' : ''}{momentum.toFixed(2)}
                              </span>
                              <span className={`text-xs ${getMomentumTextColor(momentum)}`}>
                                {getMomentumLabel(momentum)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Last 3 Games */}
                      {recentGames.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                            Last {recentGames.length} Game{recentGames.length !== 1 ? 's' : ''}
                          </div>
                          <div className="flex flex-col gap-1">
                            {recentGames.map((g, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <span
                                  className={`w-5 text-center font-bold text-xs ${
                                    g.result === 'W'
                                      ? 'text-green-400'
                                      : g.result === 'L'
                                      ? 'text-red-400'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {g.result}
                                </span>
                                <span className="text-gray-300">{g.score}</span>
                                <span className="text-gray-500 text-xs">
                                  {g.year} Wk {g.week}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Moments Log */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Key Moments
                    </div>

                    {/* Existing moments */}
                    {moments.length > 0 ? (
                      <ul className="flex flex-col gap-1.5 mb-3">
                        {moments.map((moment, idx) => (
                          <li
                            key={idx}
                            className="flex items-start justify-between gap-2 text-sm"
                          >
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="text-amber-400 font-semibold flex-shrink-0">
                                {moment.year}
                              </span>
                              <span className="text-gray-300 truncate">{moment.description}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteMoment(rival.id, moment)}
                              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                              aria-label={`Delete moment: ${moment.description}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-600 italic mb-2">
                        No key moments recorded yet.
                      </p>
                    )}

                    {/* Add moment form */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={momentForm.year}
                        onChange={(e) =>
                          setMomentForm(rival.id, { ...momentForm, year: e.target.value })
                        }
                        placeholder="Year"
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        value={momentForm.description}
                        onChange={(e) =>
                          setMomentForm(rival.id, { ...momentForm, description: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMoment(rival.id);
                          }
                        }}
                        placeholder="Describe the moment..."
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleAddMoment(rival.id)}
                        disabled={!momentForm.year || !momentForm.description.trim()}
                        className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold rounded transition-colors flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
