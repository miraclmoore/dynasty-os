import React, { useState, useEffect } from 'react';
import { useDynastyStore, useNavigationStore, useScoutingStore } from '../store';
import { getHeadToHeadRecords } from '../lib/records-service';
import type { HeadToHeadRecord } from '../lib/records-service';

export function ScoutingCardPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { goToDashboard } = useNavigationStore();
  const notes = useScoutingStore((s) => s.notes);
  const { loadNotes, saveNote } = useScoutingStore();

  const [h2hRecords, setH2hRecords] = useState<HeadToHeadRecord[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTendencies, setEditingTendencies] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDynasty) return;
    getHeadToHeadRecords(activeDynasty.id).then(setH2hRecords);
    loadNotes(activeDynasty.id);
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  const filteredRecords = h2hRecords.filter((r) =>
    r.opponent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRecord = selectedOpponent
    ? h2hRecords.find((r) => r.opponent === selectedOpponent) ?? null
    : null;

  const note = notes.find((n) => n.opponent === selectedOpponent) ?? null;

  const handleSelectOpponent = (opponent: string) => {
    setSelectedOpponent(opponent);
    setIsEditing(false);
    setEditingTendencies('');
  };

  const handleStartEdit = () => {
    setEditingTendencies(note?.tendencies ?? '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTendencies('');
  };

  const handleSave = async () => {
    if (!selectedOpponent) return;
    setSaving(true);
    await saveNote(activeDynasty.id, selectedOpponent, editingTendencies);
    setSaving(false);
    setIsEditing(false);
  };

  // Last 5 games sorted by year/week descending
  const recentGames = selectedRecord
    ? [...selectedRecord.games]
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.week - a.week;
        })
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold tracking-tight">Opponent Scouting Cards</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel — Opponent selector (1/3 width on desktop) */}
          <div className="lg:w-1/3 flex flex-col gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opponents..."
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-amber-500"
            />

            {h2hRecords.length === 0 ? (
              <div className="text-gray-500 text-sm italic py-4 text-center">
                No game history yet. Log games to unlock scouting cards.
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-gray-500 text-sm italic py-4 text-center">
                No opponents match "{searchQuery}".
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredRecords.map((record) => (
                  <button
                    key={record.opponent}
                    onClick={() => handleSelectOpponent(record.opponent)}
                    className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer text-left transition-colors ${
                      selectedOpponent === record.opponent
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    }`}
                  >
                    <span className="font-medium text-sm truncate">{record.opponent}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {record.wins}-{record.losses}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — Scouting card (2/3 width on desktop) */}
          <div className="lg:w-2/3">
            {!selectedOpponent || !selectedRecord ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm italic">
                Select an opponent to view their scouting card.
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 flex flex-col gap-6">
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold">{selectedRecord.opponent}</h2>
                  <button
                    onClick={() => setSelectedOpponent(null)}
                    className="text-gray-500 hover:text-white transition-colors"
                    aria-label="Close scouting card"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* H2H Record section */}
                <div className="flex items-center gap-8">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Record</div>
                    <div
                      className={`text-3xl font-bold ${
                        selectedRecord.winPct >= 50 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {selectedRecord.wins}-{selectedRecord.losses}
                      {selectedRecord.ties > 0 ? `-${selectedRecord.ties}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Streak</div>
                    <div
                      className={`text-lg font-bold ${
                        selectedRecord.currentStreak.type === 'W'
                          ? 'text-green-400'
                          : selectedRecord.currentStreak.type === 'L'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {selectedRecord.currentStreak.type}{selectedRecord.currentStreak.count}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win%</div>
                    <div className="text-lg font-semibold text-gray-200">
                      {selectedRecord.winPct}%
                    </div>
                  </div>
                </div>

                {/* Recent games table */}
                {recentGames.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Recent Games
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700">
                          <th className="text-left pb-2 pr-4">Season</th>
                          <th className="text-left pb-2 pr-4">Week</th>
                          <th className="text-left pb-2 pr-4">Result</th>
                          <th className="text-left pb-2">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentGames.map((game, i) => (
                          <tr key={i} className="border-b border-gray-700/50">
                            <td className="py-2 pr-4 text-gray-300">{game.year}</td>
                            <td className="py-2 pr-4 text-gray-300">{game.week}</td>
                            <td className="py-2 pr-4">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  game.result === 'W'
                                    ? 'bg-green-800 text-green-200'
                                    : game.result === 'L'
                                    ? 'bg-red-800 text-red-200'
                                    : 'bg-yellow-800 text-yellow-200'
                                }`}
                              >
                                {game.result}
                              </span>
                            </td>
                            <td className="py-2 text-gray-300">{game.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tendency Notes section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Scouting Notes
                    </h3>
                    {!isEditing && (
                      <button
                        onClick={handleStartEdit}
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={editingTendencies}
                        onChange={(e) => setEditingTendencies(e.target.value)}
                        placeholder="Add tendency notes, play-calling tendencies, defensive schemes..."
                        className="bg-gray-700 text-white w-full p-3 rounded min-h-[120px] text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {saving ? 'Saving...' : 'Save Notes'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {note?.tendencies ? (
                        <p className="text-gray-300 whitespace-pre-wrap">{note.tendencies}</p>
                      ) : (
                        <p className="text-gray-500 italic">
                          No scouting notes yet — add notes below.
                        </p>
                      )}
                      {!note?.tendencies && (
                        <button
                          onClick={handleStartEdit}
                          className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Add Notes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
