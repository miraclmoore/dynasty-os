import React from 'react';
import type { LegacyCardData } from '../lib/legacy-card-service';

interface LegacyCardProps {
  cardData: LegacyCardData;
  teamName: string;
}

// Top stat keys to show on the card — pick non-zero entries, max 8
function getTopStats(
  careerStats: Record<string, number>
): Array<{ key: string; label: string; value: number }> {
  const STAT_LABELS: Record<string, string> = {
    gamesPlayed: 'Games',
    passingYards: 'Pass Yds',
    passingTDs: 'Pass TDs',
    interceptions: 'INT',
    completions: 'Comp',
    attempts: 'Att',
    passerRating: 'Rating',
    rushingYards: 'Rush Yds',
    rushingTDs: 'Rush TDs',
    rushingAttempts: 'Carries',
    receivingYards: 'Rec Yds',
    receivingTDs: 'Rec TDs',
    receptions: 'Rec',
    tackles: 'Tackles',
    sacks: 'Sacks',
    defenseInterceptions: 'INTs',
    forcedFumbles: 'FF',
    passDeflections: 'PD',
    fgMade: 'FGM',
    fgAttempted: 'FGA',
    punts: 'Punts',
    puntAverage: 'Avg',
  };

  return Object.entries(careerStats)
    .filter(([, v]) => v !== 0)
    .map(([key, value]) => ({
      key,
      label: STAT_LABELS[key] ?? key,
      value,
    }))
    .slice(0, 8);
}

export const LegacyCard = React.forwardRef<HTMLDivElement, LegacyCardProps>(
  function LegacyCard({ cardData, teamName }, ref) {
    const { player, careerStats, careerAwards, seasonCount, blurb } = cardData;
    const topStats = getTopStats(careerStats);
    const departureYear = player.departureYear;

    return (
      <div
        ref={ref}
        style={{ width: '400px', fontFamily: 'system-ui, sans-serif' }}
        className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-amber-700/40 shadow-2xl overflow-hidden"
      >
        {/* Gold top accent */}
        <div className="h-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                {player.firstName} {player.lastName}
              </h2>
              <p className="text-amber-400 text-sm font-semibold mt-0.5 tracking-wide">
                {player.position}
                {player.jerseyNumber !== undefined && (
                  <span className="text-gray-400 font-normal"> · #{player.jerseyNumber}</span>
                )}
              </p>
            </div>
            {/* Season badge */}
            <div className="text-right">
              <div className="bg-amber-900/40 border border-amber-700/50 rounded-lg px-3 py-1.5 text-center">
                <p className="text-amber-300 text-xs font-medium uppercase tracking-wider">Seasons</p>
                <p className="text-white text-xl font-bold">{seasonCount}</p>
              </div>
            </div>
          </div>

          {/* Class of line */}
          {departureYear && (
            <p className="text-gray-500 text-xs mt-2 tracking-wider uppercase">
              Class of {departureYear}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-amber-700/30" />

        {/* Career stats grid */}
        {topStats.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">
              Career Stats
            </p>
            <div className="grid grid-cols-4 gap-2">
              {topStats.map(({ key, label, value }) => (
                <div key={key} className="bg-gray-700/50 rounded-lg px-2 py-2 text-center">
                  <p className="text-gray-400 text-xs truncate mb-0.5">{label}</p>
                  <p className="text-white font-bold text-sm">
                    {typeof value === 'number' && !Number.isInteger(value)
                      ? value.toFixed(1)
                      : value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Awards */}
        {careerAwards.length > 0 && (
          <div className="px-6 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">
              Honors
            </p>
            <div className="flex flex-wrap gap-1.5">
              {careerAwards.map((award) => (
                <span
                  key={award}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/50 text-amber-300 border border-amber-700/40"
                >
                  {award}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Blurb */}
        {blurb && (
          <div className="mx-6 mb-4 mt-1 bg-gray-700/30 rounded-lg px-4 py-3 border-l-2 border-amber-600/60">
            <p className="text-gray-300 text-xs italic leading-relaxed">{blurb}</p>
          </div>
        )}

        {/* Footer */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent mx-6" />
        <div className="px-6 py-3 flex items-center justify-between">
          <p className="text-gray-600 text-xs font-medium tracking-wider uppercase">
            Dynasty OS
          </p>
          <p className="text-gray-600 text-xs font-medium truncate max-w-[200px]">
            {teamName} Program Legends
          </p>
        </div>
      </div>
    );
  }
);
