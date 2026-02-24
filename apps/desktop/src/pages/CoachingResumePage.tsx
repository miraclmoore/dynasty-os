import React from 'react';
import { useNavigationStore } from '../store/navigation-store';

// Stub — full implementation in 07-02 Task 3
export function CoachingResumePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => useNavigationStore.getState().goToDashboard()}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Coaching Resume</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6">
        <p className="text-gray-500 text-sm">Loading career stats...</p>
      </main>
    </div>
  );
}
