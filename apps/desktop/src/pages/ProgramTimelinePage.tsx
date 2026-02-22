import React, { useState, useEffect } from 'react';
import { useDynastyStore } from '../store';
import { useNavigationStore } from '../store/navigation-store';
import { getTimelineNodes, type TimelineNode } from '../lib/timeline-service';

export function ProgramTimelinePage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeDynasty) return;
    getTimelineNodes(activeDynasty.id)
      .then((result) => setNodes(result))
      .finally(() => setLoading(false));
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .timeline-node { page-break-inside: avoid; border: 1px solid #ccc !important; }
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 no-print">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Export PDF
          </button>
        </div>
      </header>

      {/* Print header (visible only when printing) */}
      <div className="hidden print:block px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">{activeDynasty.name} — Program Timeline</h1>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-bold text-white mb-6 no-print">Program Timeline</h1>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading timeline...</span>
          </div>
        )}

        {!loading && nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 text-sm max-w-sm">
              No seasons logged yet. Start logging seasons to build your program timeline.
            </p>
          </div>
        )}

        {!loading && nodes.length > 0 && (
          <div className="flex flex-col gap-4">
            {nodes.map((node) => (
              <div
                key={node.seasonId}
                className="bg-gray-800 rounded-lg p-4 border-l-4 border-amber-500 timeline-node"
              >
                {/* Year */}
                <div className="text-xl font-bold text-amber-400 mb-1">{node.year}</div>

                {/* Record */}
                <div className="text-2xl font-bold text-white mb-2">
                  {node.wins}-{node.losses}
                  {node.confWins + node.confLosses > 0 && (
                    <span className="text-base font-normal text-gray-400 ml-2">
                      ({node.confWins}-{node.confLosses} conf)
                    </span>
                  )}
                </div>

                {/* Final ranking */}
                {node.finalRanking !== null && (
                  <div className="text-sm text-amber-400 mb-1">
                    Final Ranking: #{node.finalRanking}
                  </div>
                )}

                {/* Bowl result */}
                {node.bowlGame !== null && (
                  <div
                    className={`text-sm mb-1 ${
                      node.bowlResult === 'W' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {node.bowlResult === 'W' ? 'Won' : 'Lost'} {node.bowlGame}
                    {node.bowlOpponent ? ` vs ${node.bowlOpponent}` : ''}
                  </div>
                )}

                {/* Tagline */}
                {node.tagline && (
                  <div className="text-sm italic text-gray-300 mt-2 mb-1">
                    &ldquo;{node.tagline}&rdquo;
                  </div>
                )}

                {/* Key events */}
                {node.keyEvents.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-400 space-y-0.5">
                    {node.keyEvents.map((event, i) => (
                      <li key={i}>{event}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
