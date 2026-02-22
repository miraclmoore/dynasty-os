import React, { useState, useEffect } from 'react';
import { getSportConfig } from '@dynasty-os/sport-configs';
import type { SportType } from '@dynasty-os/core-types';
import { useDynastyStore } from '../store';

interface CreateDynastyModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

const SPORTS: { value: SportType; label: string }[] = [
  { value: 'cfb', label: 'College Football' },
  { value: 'madden', label: 'Madden NFL' },
];

const CURRENT_YEAR = new Date().getFullYear();

export function CreateDynastyModal({ onClose, onCreated }: CreateDynastyModalProps) {
  const createDynasty = useDynastyStore((s) => s.createDynasty);
  const loading = useDynastyStore((s) => s.loading);

  const [sport, setSport] = useState<SportType>('cfb');
  const [teamName, setTeamName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [startYear, setStartYear] = useState(CURRENT_YEAR);
  const [gameVersion, setGameVersion] = useState('');
  const [dynastyName, setDynastyName] = useState('');
  const [error, setError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const config = getSportConfig(sport);

  // Reset team and game version when sport changes
  useEffect(() => {
    setTeamName('');
    setGameVersion(config.gameVersions[0] ?? '');
  }, [sport]);

  // Auto-fill dynasty name unless user has manually edited it
  useEffect(() => {
    if (!nameTouched && teamName) {
      setDynastyName(`${teamName} Dynasty`);
    } else if (!nameTouched && !teamName) {
      setDynastyName('');
    }
  }, [teamName, nameTouched]);

  // Sort teams alphabetically for the dropdown
  const sortedTeams = [...config.teams].sort((a, b) => a.name.localeCompare(b.name));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!teamName) {
      setError('Please select a team.');
      return;
    }
    if (!coachName.trim()) {
      setError('Please enter a coach name.');
      return;
    }
    if (!startYear || startYear < 1990 || startYear > 2100) {
      setError('Please enter a valid start year (1990-2100).');
      return;
    }
    if (!gameVersion) {
      setError('Please select a game version.');
      return;
    }
    if (!dynastyName.trim()) {
      setError('Please enter a dynasty name.');
      return;
    }

    try {
      await createDynasty({
        sport,
        teamName,
        coachName: coachName.trim(),
        startYear,
        gameVersion,
        name: dynastyName.trim(),
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Create New Dynasty</h2>
          <button
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Sport Toggle */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Sport</label>
            <div className="flex gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sport === s.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  onClick={() => setSport(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Team Select */}
          <div>
            <label htmlFor="team" className="block text-sm text-gray-400 mb-1">
              Team
            </label>
            <select
              id="team"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            >
              <option value="">-- Select team --</option>
              {sortedTeams.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynasty Name */}
          <div>
            <label htmlFor="dynastyName" className="block text-sm text-gray-400 mb-1">
              Dynasty Name
            </label>
            <input
              id="dynastyName"
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Texas Longhorns Dynasty"
              value={dynastyName}
              onChange={(e) => {
                setNameTouched(true);
                setDynastyName(e.target.value);
              }}
            />
          </div>

          {/* Coach Name */}
          <div>
            <label htmlFor="coach" className="block text-sm text-gray-400 mb-1">
              Coach Name
            </label>
            <input
              id="coach"
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Your coach name"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
            />
          </div>

          {/* Start Year */}
          <div>
            <label htmlFor="startYear" className="block text-sm text-gray-400 mb-1">
              Start Year
            </label>
            <input
              id="startYear"
              type="number"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              min={1990}
              max={2100}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
            />
          </div>

          {/* Game Version */}
          <div>
            <label htmlFor="gameVersion" className="block text-sm text-gray-400 mb-1">
              Game Version
            </label>
            <select
              id="gameVersion"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={gameVersion}
              onChange={(e) => setGameVersion(e.target.value)}
            >
              {config.gameVersions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="flex-1 py-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 text-sm transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Creating...' : 'Create Dynasty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
