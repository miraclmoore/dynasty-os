import React, { useState, useEffect } from 'react';
import type { Player, SportType, PlayerStatus } from '@dynasty-os/core-types';
import { getSportConfig } from '@dynasty-os/sport-configs';
import { usePlayerStore } from '../store/player-store';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  sport: SportType;
}

const STATUS_OPTIONS: { value: PlayerStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'drafted', label: 'Drafted' },
  { value: 'injured', label: 'Injured' },
  { value: 'other', label: 'Other' },
];

export function EditPlayerModal({ isOpen, onClose, player, sport }: EditPlayerModalProps) {
  const sportConfig = getSportConfig(sport);
  const loading = usePlayerStore((s) => s.loading);

  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [position, setPosition] = useState(player.position);
  const [jerseyNumber, setJerseyNumber] = useState(
    player.jerseyNumber !== undefined ? String(player.jerseyNumber) : ''
  );
  const [recruitingStars, setRecruitingStars] = useState(
    player.recruitingStars !== undefined ? String(player.recruitingStars) : ''
  );
  const [homeState, setHomeState] = useState(player.homeState ?? '');
  const [homeCity, setHomeCity] = useState(player.homeCity ?? '');
  const [classYear, setClassYear] = useState(player.classYear ?? '');
  const [height, setHeight] = useState(player.height ?? '');
  const [weight, setWeight] = useState(
    player.weight !== undefined ? String(player.weight) : ''
  );
  const [status, setStatus] = useState<PlayerStatus>(player.status);
  const [error, setError] = useState('');

  // Sync form when player prop changes
  useEffect(() => {
    setFirstName(player.firstName);
    setLastName(player.lastName);
    setPosition(player.position);
    setJerseyNumber(player.jerseyNumber !== undefined ? String(player.jerseyNumber) : '');
    setRecruitingStars(player.recruitingStars !== undefined ? String(player.recruitingStars) : '');
    setHomeState(player.homeState ?? '');
    setHomeCity(player.homeCity ?? '');
    setClassYear(player.classYear ?? '');
    setHeight(player.height ?? '');
    setWeight(player.weight !== undefined ? String(player.weight) : '');
    setStatus(player.status);
    setError('');
  }, [player]);

  const isValid = firstName.trim() !== '' && lastName.trim() !== '' && position !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('First name, last name, and position are required.');
      return;
    }

    try {
      await usePlayerStore.getState().updatePlayer(player.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        position,
        status,
        jerseyNumber: jerseyNumber !== '' ? parseInt(jerseyNumber, 10) : undefined,
        recruitingStars: recruitingStars !== '' ? parseInt(recruitingStars, 10) : undefined,
        homeState: homeState.trim() || undefined,
        homeCity: homeCity.trim() || undefined,
        classYear: classYear || undefined,
        height: height.trim() || undefined,
        weight: weight !== '' ? parseInt(weight, 10) : undefined,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">
            Edit Player — {player.firstName} {player.lastName}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Position + Jersey Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Position <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                {sportConfig.positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Jersey # <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
              >
                <option value="">—</option>
                {Array.from({ length: 100 }, (_, i) => i).map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value as PlayerStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Class Year + Recruiting Stars */}
          <div className="grid grid-cols-2 gap-3">
            {sportConfig.classYears && sportConfig.classYears.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Class Year <span className="text-gray-600 text-xs">(optional)</span>
                </label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                >
                  <option value="">—</option>
                  {sportConfig.classYears.map((cy) => (
                    <option key={cy} value={cy}>
                      {cy}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Recruiting Stars <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                value={recruitingStars}
                onChange={(e) => setRecruitingStars(e.target.value)}
              >
                <option value="">—</option>
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={String(s)}>
                    {'★'.repeat(s)} ({s}-star)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Home State + Home City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Home State <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. TX"
                maxLength={2}
                value={homeState}
                onChange={(e) => setHomeState(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Home City <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Houston"
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
              />
            </div>
          </div>

          {/* Height + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Height <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder='e.g. 6&apos;2"'
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Weight (lbs) <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <input
                type="number"
                min="100"
                max="400"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 215"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="flex-1 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
