import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useDynastyStore } from '../store';
import { usePlayerStore } from '../store/player-store';
import { useNilStore } from '../store/nil-store';
import { useNavigationStore } from '../store/navigation-store';
import { computeNilSpendByPosition, computeNilSpendByYear } from '../lib/nil-service';

const CURRENT_YEAR = new Date().getFullYear();

interface AddNilFormState {
  playerId: string;
  brand: string;
  amount: string;
  year: number;
  durationMonths: string;
  notes: string;
}

const EMPTY_FORM: AddNilFormState = {
  playerId: '',
  brand: '',
  amount: '',
  year: CURRENT_YEAR,
  durationMonths: '',
  notes: '',
};

function formatDollars(n: number): string {
  return '$' + n.toLocaleString();
}

export function NilLedgerPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);
  const { players, loadPlayers } = usePlayerStore();
  const { entries, loading, loadEntries, addEntry, removeEntry } = useNilStore();

  const [form, setForm] = useState<AddNilFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // CFB sport guard — Madden users see nothing
  if (!activeDynasty || activeDynasty.sport !== 'cfb') return null;

  useEffect(() => {
    loadPlayers(activeDynasty.id);
    loadEntries(activeDynasty.id);
  }, [activeDynasty.id]);

  // Build player map (id -> {position, name}) for aggregation
  const playerMap = useMemo(() => {
    const map = new Map<string, { position: string }>();
    for (const p of players) {
      map.set(p.id, { position: p.position });
    }
    return map;
  }, [players]);

  const spendByPosition = useMemo(
    () => computeNilSpendByPosition(entries, playerMap),
    [entries, playerMap]
  );
  const spendByYear = useMemo(() => computeNilSpendByYear(entries), [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.playerId) {
      setFormError('Player is required.');
      return;
    }
    if (!form.brand.trim()) {
      setFormError('Brand is required.');
      return;
    }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }
    setFormError(null);

    const player = players.find((p) => p.id === form.playerId);
    const playerName = player ? `${player.firstName} ${player.lastName}` : 'Unknown';

    await addEntry(
      {
        dynastyId: activeDynasty.id,
        playerId: form.playerId,
        playerName,
        brand: form.brand.trim(),
        amount,
        year: form.year,
        durationMonths: form.durationMonths ? parseInt(form.durationMonths, 10) : undefined,
        notes: form.notes.trim() || undefined,
      },
      activeDynasty.id
    );
    setForm(EMPTY_FORM);
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
          <h1 className="text-xl font-bold tracking-tight">NIL Ledger</h1>
          <span className="text-sm text-gray-400">{activeDynasty.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Log Deal Form */}
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-base font-semibold text-gray-200 mb-4">Log NIL Deal</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Player picker */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Player <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.playerId}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, playerId: e.target.value }));
                    setFormError(null);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select a player...</option>
                  {players
                    .filter((p) => !p.departureYear)
                    .sort((a, b) =>
                      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.position})
                      </option>
                    ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Brand / Sponsor <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, brand: e.target.value }));
                    setFormError(null);
                  }}
                  placeholder="e.g. Nike, Gatorade"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Amount ($) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.amount}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, amount: e.target.value }));
                    setFormError(null);
                  }}
                  placeholder="e.g. 50000"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: parseInt(e.target.value, 10) || CURRENT_YEAR }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Duration (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Duration (months) <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.durationMonths}
                  onChange={(e) => setForm((f) => ({ ...f, durationMonths: e.target.value }))}
                  placeholder="e.g. 12"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Notes <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional context..."
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Log NIL Deal'}
              </button>
            </form>
          </div>

          {/* Spend Breakdown Charts */}
          <div className="flex flex-col gap-4">
            {entries.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 flex items-center justify-center">
                <p className="text-sm text-gray-500 italic text-center">
                  No NIL deals logged yet. Log your first deal to see spend breakdowns.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gray-800 rounded-lg p-5">
                  <h2 className="text-base font-semibold text-gray-200 mb-4">Spend by Position</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={spendByPosition} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <XAxis
                        dataKey="position"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) => [value != null ? formatDollars(value) : '$0', 'Total']}
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                        cursor={{ fill: 'rgba(217,119,6,0.08)' }}
                      />
                      <Bar dataKey="total" fill="#d97706" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-5">
                  <h2 className="text-base font-semibold text-gray-200 mb-4">Spend by Year</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={spendByYear} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <XAxis
                        dataKey="year"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) => [value != null ? formatDollars(value) : '$0', 'Total']}
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                        cursor={{ fill: 'rgba(217,119,6,0.08)' }}
                      />
                      <Bar dataKey="total" fill="#d97706" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deal Log Table */}
        {entries.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-base font-semibold text-gray-200 mb-4">
              Deal Log
              <span className="ml-2 text-xs font-normal text-gray-500">({entries.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                    <th className="pb-2 text-left font-medium">Player</th>
                    <th className="pb-2 text-left font-medium">Brand</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 text-right font-medium">Year</th>
                    <th className="pb-2 text-right font-medium">Duration</th>
                    <th className="pb-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors">
                      <td className="py-2 text-gray-200 font-medium">{entry.playerName}</td>
                      <td className="py-2 text-gray-300">{entry.brand}</td>
                      <td className="py-2 text-right text-amber-400 font-semibold tabular-nums">
                        {formatDollars(entry.amount)}
                      </td>
                      <td className="py-2 text-right text-gray-400">{entry.year}</td>
                      <td className="py-2 text-right text-gray-500">
                        {entry.durationMonths ? `${entry.durationMonths}mo` : '—'}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => removeEntry(entry.id, activeDynasty.id)}
                          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-red-900/60 text-gray-500 hover:text-red-300 transition-colors"
                          aria-label={`Delete NIL deal for ${entry.playerName}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
