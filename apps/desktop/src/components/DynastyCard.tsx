import React, { useState } from 'react';
import type { Dynasty } from '@dynasty-os/core-types';

interface DynastyCardProps {
  dynasty: Dynasty;
  onClick: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const SPORT_BADGE: Record<string, { label: string; classes: string }> = {
  cfb: { label: 'CFB', classes: 'bg-orange-600 text-orange-100' },
  madden: { label: 'NFL', classes: 'bg-green-700 text-green-100' },
};

export function DynastyCard({ dynasty, onClick, onExport, onDelete }: DynastyCardProps) {
  const [confirming, setConfirming] = useState(false);
  const badge = SPORT_BADGE[dynasty.sport] ?? { label: dynasty.sport.toUpperCase(), classes: 'bg-gray-600 text-gray-100' };

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(true);
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(false);
    onDelete();
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(false);
  }

  function handleExportClick(e: React.MouseEvent) {
    e.stopPropagation();
    onExport();
  }

  return (
    <div
      className="bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg p-5 cursor-pointer transition-all hover:bg-gray-750 group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{dynasty.name}</h3>
          <p className="text-gray-400 text-sm truncate">{dynasty.teamName}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${badge.classes}`}>
          {badge.label}
        </span>
      </div>

      <dl className="space-y-1 mb-4">
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Coach</dt>
          <dd className="text-gray-300 truncate max-w-[60%] text-right">{dynasty.coachName}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Current Year</dt>
          <dd className="text-gray-300">{dynasty.currentYear}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Game</dt>
          <dd className="text-gray-300 truncate max-w-[60%] text-right">{dynasty.gameVersion}</dd>
        </div>
      </dl>

      {confirming ? (
        <div
          className="flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-gray-400 text-xs flex-1 self-center">Delete this dynasty?</span>
          <button
            className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
            onClick={handleConfirmDelete}
          >
            Delete
          </button>
          <button
            className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            onClick={handleCancelDelete}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            className="flex-1 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            onClick={handleExportClick}
          >
            Export
          </button>
          <button
            className="flex-1 py-1.5 text-xs rounded bg-gray-700 hover:bg-red-900 text-gray-400 hover:text-red-300 transition-colors"
            onClick={handleDeleteClick}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
