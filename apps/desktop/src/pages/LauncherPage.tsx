import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GiAmericanFootballBall } from 'react-icons/gi';
import { useDynastyStore } from '../store';
import { DynastyCard } from '../components/DynastyCard';
import { CreateDynastyModal } from '../components/CreateDynastyModal';
import { ExportImportControls } from '../components/ExportImportControls';
import type { Dynasty } from '@dynasty-os/core-types';

const SPORT_CHIPS = [
  { key: 'cfb',    label: '🏈 CFB',    active: 'bg-orange-600 text-white', inactive: 'text-orange-400 border border-orange-800 hover:bg-orange-900/40' },
  { key: 'madden', label: '⚡ NFL',    active: 'bg-blue-600 text-white',   inactive: 'text-blue-400 border border-blue-800 hover:bg-blue-900/40' },
  { key: 'nfl2k',  label: '🎮 NFL 2K', active: 'bg-purple-600 text-white', inactive: 'text-purple-400 border border-purple-800 hover:bg-purple-900/40' },
] as const;

export function LauncherPage() {
  const dynasties = useDynastyStore((s) => s.dynasties);
  const loading = useDynastyStore((s) => s.loading);
  const loadDynasties = useDynastyStore((s) => s.loadDynasties);
  const setActiveDynasty = useDynastyStore((s) => s.setActiveDynasty);
  const exportDynasty = useDynastyStore((s) => s.exportDynasty);
  const deleteDynasty = useDynastyStore((s) => s.deleteDynasty);

  const importDynastyFromFile = useDynastyStore((s) => s.importDynastyFromFile);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  useEffect(() => {
    void loadDynasties();
  }, [loadDynasties]);

  const visibleDynasties = sportFilter
    ? dynasties.filter((d) => d.sport === sportFilter)
    : dynasties;

  function handleOpen(dynasty: Dynasty) {
    setActiveDynasty(dynasty);
  }

  async function handleExport(id: string) {
    try {
      await exportDynasty(id);
    } catch {
      // error is shown via store.error
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDynasty(id);
    } catch {
      // error handled in store
    }
  }

  return (
    <div className="min-h-screen bg-[#080d14] bg-field-pattern text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5 bg-gradient-to-b from-black/30 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center shadow-lg">
              <span className="text-lg leading-none select-none">🏈</span>
            </div>
            <div>
              <h1 className="font-display text-2xl tracking-widest leading-none text-white">Dynasty OS</h1>
              <p className="text-gray-400 text-xs mt-0.5 font-sans">The memory layer for your dynasty</p>
            </div>
          </div>
          {dynasties.length > 0 && <ExportImportControls />}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Section header + filter chips */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <h2 className="font-heading font-semibold text-base text-gray-200 tracking-wide mr-2 uppercase">
            Your Dynasties
          </h2>
          {SPORT_CHIPS.map(({ key, label, active, inactive }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSportFilter(sportFilter === key ? null : key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                sportFilter === key ? active : inactive
              }`}
            >
              {label}
            </motion.button>
          ))}
          <div className="flex-1" />
          {dynasties.length > 0 && (
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              onClick={() => setShowCreate(true)}
            >
              + New Dynasty
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && dynasties.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800/50 border border-white/5 border-l-4 border-l-gray-700 rounded-xl p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-700/60 rounded w-3/4" />
                    <div className="h-3 bg-gray-700/60 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-12 bg-gray-700/60 rounded shrink-0" />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-700/60 rounded" />
                  <div className="h-3 bg-gray-700/60 rounded" />
                  <div className="h-3 bg-gray-700/60 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 bg-gray-700/60 rounded-lg" />
                  <div className="flex-1 h-8 bg-gray-700/60 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

        ) : dynasties.length === 0 ? (
          /* Empty state — no dynasties at all */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
              <GiAmericanFootballBall className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-display text-3xl tracking-widest text-white mb-2">No dynasties yet.</h3>
            <p className="text-gray-300 text-sm mb-8 max-w-xs leading-relaxed">
              Build your legacy — track every game, recruit, and championship across college football, Madden, or NFL 2K.
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/40"
              onClick={() => setShowCreate(true)}
            >
              Start Your Dynasty
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            {/* Sport legend row */}
            <div className="flex items-center gap-5 mt-10">
              {[
                { dot: 'bg-orange-500', label: 'College Football' },
                { dot: 'bg-blue-500',   label: 'Madden NFL' },
                { dot: 'bg-purple-500', label: 'NFL 2K' },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-sm text-gray-400 font-heading">{label}</span>
                </div>
              ))}
            </div>

            {/* Import escape hatch — for returning users with a backup */}
            <button
              onClick={() => importFileRef.current?.click()}
              className="mt-6 text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
            >
              Already have a Dynasty OS backup? Import it
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = '';
                try {
                  await importDynastyFromFile(file);
                } catch {
                  // error shown via store
                }
              }}
            />
          </div>

        ) : (
          /* Dynasty grid */
          <>
            {visibleDynasties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <p className="text-gray-600 text-sm">
                  No {sportFilter?.toUpperCase()} dynasties yet.
                </p>
                <button
                  className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                  onClick={() => setSportFilter(null)}
                >
                  Clear filter
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {visibleDynasties.map((d, i) => (
                    <DynastyCard
                      key={d.id}
                      dynasty={d}
                      index={i}
                      onClick={() => handleOpen(d)}
                      onExport={() => handleExport(d.id)}
                      onDelete={() => handleDelete(d.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <CreateDynastyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            // Set pending flag — App.tsx watches activeDynasty and opens tour when it sees this
            localStorage.setItem('dynasty-os-onboarding-pending', 'true');
          }}
        />
      )}
    </div>
  );
}
