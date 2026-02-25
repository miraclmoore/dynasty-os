import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useNavigationStore } from '../store/navigation-store';
import { COMMUNITY_ROSTERS, MADDEN_YEARS, type RosterEntry } from '../lib/roster-hub-data';

// ── Tag pill ──────────────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
      {label}
    </span>
  );
}

// ── Roster card ───────────────────────────────────────────────────────────────

function RosterCard({ entry }: { entry: RosterEntry }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      await open(entry.url);
    } catch {
      // Fallback: silently fail; the URL is visible in the card
    }
    setOpening(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate">{entry.title}</h3>
            {entry.version && (
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-green-900/60 text-green-400 font-medium">
                {entry.version}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">by {entry.author}</p>
        </div>
        <button
          onClick={handleOpen}
          disabled={opening}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {opening ? (
            'Opening…'
          ) : (
            <>
              View
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{entry.description}</p>

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RosterHubPage() {
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const filtered = selectedYear === 'all'
    ? COMMUNITY_ROSTERS
    : COMMUNITY_ROSTERS.filter((r) => r.maddenYear === selectedYear);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToDashboard}
              className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              ← Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-lg font-bold">Community Roster Hub</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Explainer */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-green-900/60 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-300 font-medium">Fan-made community rosters</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              These rosters are created and maintained by the Madden community on Operation Sports, Reddit, and Discord.
              Clicking "View" opens the source page in your browser where you can download the roster file and load it into Madden.
              Dynasty OS uses franchise saves (<span className="font-mono">.frs</span>) — load your desired roster in Madden first, then start your franchise.
            </p>
          </div>
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Madden:</span>
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedYear === 'all' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            All Years
          </button>
          {MADDEN_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedYear === year ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              M{year}
            </button>
          ))}
        </div>

        {/* Roster list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600">No rosters found for this filter.</div>
          ) : (
            filtered.map((entry) => <RosterCard key={entry.id} entry={entry} />)
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-700 text-center pb-2">
          Know a great roster not listed here? The roster list is maintained in{' '}
          <span className="font-mono text-gray-600">src/lib/roster-hub-data.ts</span>
        </p>
      </main>
    </div>
  );
}
