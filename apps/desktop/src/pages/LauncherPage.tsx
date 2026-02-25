import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { DynastyCard } from '../components/DynastyCard';
import { CreateDynastyModal } from '../components/CreateDynastyModal';
import { OnboardingModal, ONBOARDING_STORAGE_KEY } from '../components/OnboardingModal';
import { ExportImportControls } from '../components/ExportImportControls';
import type { Dynasty } from '@dynasty-os/core-types';

export function LauncherPage() {
  const dynasties = useDynastyStore((s) => s.dynasties);
  const loading = useDynastyStore((s) => s.loading);
  const loadDynasties = useDynastyStore((s) => s.loadDynasties);
  const setActiveDynasty = useDynastyStore((s) => s.setActiveDynasty);
  const exportDynasty = useDynastyStore((s) => s.exportDynasty);
  const deleteDynasty = useDynastyStore((s) => s.deleteDynasty);

  const [showCreate, setShowCreate] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void loadDynasties();
  }, [loadDynasties]);

  function handleOpen(dynasty: Dynasty) {
    setActiveDynasty(dynasty);
  }

  async function handleExport(id: string) {
    try {
      await exportDynasty(id);
    } catch {
      // error is shown via store.error; card handles nothing extra
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dynasty OS</h1>
            <p className="text-gray-500 text-sm">The memory layer for your dynasty</p>
          </div>
          <ExportImportControls />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-200">Your Dynasties</h2>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            onClick={() => setShowCreate(true)}
          >
            Create New Dynasty
          </button>
        </div>

        {loading && dynasties.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800 border border-l-4 border-gray-700 rounded-lg p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-12 bg-gray-700 rounded shrink-0" />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-700 rounded" />
                  <div className="h-3 bg-gray-700 rounded" />
                  <div className="h-3 bg-gray-700 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 bg-gray-700 rounded-lg" />
                  <div className="flex-1 h-8 bg-gray-700 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : dynasties.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-xl mb-2">Start Your Dynasty</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
              Create your first dynasty to track every game, recruit, draft pick, and season milestone. Your legacy starts here.
            </p>
            <div className="flex gap-3">
              <button
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg"
                onClick={() => setShowCreate(true)}
              >
                Create New Dynasty
              </button>
            </div>
            <div className="flex items-center gap-6 mt-10 text-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-700" />
                <span className="text-xs">College Football</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-700" />
                <span className="text-xs">Madden NFL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-700" />
                <span className="text-xs">NFL 2K</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dynasties.map((d) => (
              <DynastyCard
                key={d.id}
                dynasty={d}
                onClick={() => handleOpen(d)}
                onExport={() => handleExport(d.id)}
                onDelete={() => handleDelete(d.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateDynastyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            if (dynasties.length === 0 && !localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
              setShowOnboarding(true);
            }
          }}
        />
      )}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
