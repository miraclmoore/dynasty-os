import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Dynasty } from '@dynasty-os/core-types';
import { getTeamLogoUrl } from '../lib/team-logo-service';
import { AnimatedCounter } from './AnimatedCounter';
import { SeasonSparkline } from './SeasonSparkline';

interface DynastyCardProps {
  dynasty: Dynasty;
  index?: number;
  onClick: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const SPORT_BADGE: Record<string, {
  label: string;
  badgeClasses: string;
  cardFrom: string;
  borderAccent: string;
  hoverShadow: string;
}> = {
  cfb:    {
    label: 'CFB',    badgeClasses: 'bg-orange-600 text-orange-100',
    cardFrom: 'from-orange-950/50', borderAccent: 'border-l-orange-500',
    hoverShadow: 'hover:shadow-orange-950/60',
  },
  madden: {
    label: 'NFL',    badgeClasses: 'bg-blue-700 text-blue-100',
    cardFrom: 'from-blue-950/50',   borderAccent: 'border-l-blue-500',
    hoverShadow: 'hover:shadow-blue-950/60',
  },
  nfl2k:  {
    label: 'NFL 2K', badgeClasses: 'bg-purple-700 text-purple-100',
    cardFrom: 'from-purple-950/50', borderAccent: 'border-l-purple-500',
    hoverShadow: 'hover:shadow-purple-950/60',
  },
};

export function DynastyCard({ dynasty, index = 0, onClick, onExport, onDelete }: DynastyCardProps) {
  const [confirming, setConfirming] = useState(false);
  const badge = SPORT_BADGE[dynasty.sport] ?? {
    label: dynasty.sport.toUpperCase(),
    badgeClasses: 'bg-gray-600 text-gray-100',
    cardFrom: 'from-gray-900/50',
    borderAccent: 'border-l-gray-500',
    hoverShadow: 'hover:shadow-gray-950/60',
  };
  const logoUrl = getTeamLogoUrl(dynasty.teamName, dynasty.sport);
  const dynastyYear = dynasty.currentYear - dynasty.startYear + 1;

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className={`
        bg-gradient-to-br ${badge.cardFrom} to-gray-900
        border border-white/8 ${badge.borderAccent} border-l-4
        hover:border-white/15 rounded-xl p-5 cursor-pointer
        transition-colors
        hover:shadow-xl ${badge.hoverShadow}
        group
      `}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl tracking-wide text-white truncate group-hover:text-gray-100 transition-colors leading-tight">
            {dynasty.name}
          </h3>
          <p className="text-gray-300 text-sm truncate mt-0.5">{dynasty.teamName}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {logoUrl && (
            <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center p-1 overflow-hidden">
              <img
                src={logoUrl}
                alt={dynasty.teamName}
                width={36}
                height={36}
                className="object-contain w-full h-full"
                onError={(e) => { const p = e.currentTarget.parentElement; if (p) p.style.display = 'none'; }}
              />
            </div>
          )}
          <span className={`text-xs font-bold px-2 py-1 rounded ${badge.badgeClasses}`}>{badge.label}</span>
          <span className="text-sm font-semibold text-gray-300 tabular-nums font-heading">
            Year <AnimatedCounter value={dynastyYear} />
          </span>
        </div>
      </div>

      {/* Stats */}
      <dl className="space-y-1 mb-1">
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Coach</dt>
          <dd className="text-gray-200 truncate max-w-[60%] text-right">{dynasty.coachName}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Current Year</dt>
          <dd className="text-gray-200 font-heading font-semibold">{dynasty.currentYear}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Game</dt>
          <dd className="text-gray-200 truncate max-w-[60%] text-right">{dynasty.gameVersion}</dd>
        </div>
      </dl>

      {/* Season win sparkline */}
      <SeasonSparkline dynastyId={dynasty.id} sport={dynasty.sport} />

      {/* Actions */}
      {confirming ? (
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
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
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
            onClick={handleExportClick}
          >
            Export
          </button>
          <button
            className="flex-1 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-red-900/40 text-gray-400 hover:text-red-300 transition-colors"
            onClick={handleDeleteClick}
          >
            Delete
          </button>
        </div>
      )}
    </motion.div>
  );
}
