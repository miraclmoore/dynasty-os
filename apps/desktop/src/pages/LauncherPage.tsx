import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { DynastyCard } from '../components/DynastyCard';
import { CreateDynastyModal } from '../components/CreateDynastyModal';
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
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-500">Loading dynasties...</p>
          </div>
        ) : dynasties.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-gray-300 font-medium mb-2">No dynasties yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Create your first dynasty to start tracking your legacy.
            </p>
            <button
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              onClick={() => setShowCreate(true)}
            >
              Create New Dynasty
            </button>
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
        />
      )}
    </div>
  );
}
