import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerStore } from '../store/player-store';
import { useDynastyStore } from '../store';
import { useNavigationStore } from '../store/navigation-store';
import { getPlayerSeasonsByDynasty } from '../lib/player-season-service';
import { buildLegacyCardData } from '../lib/legacy-card-service';
import type { LegacyCardData } from '../lib/legacy-card-service';
import { LegacyCard } from '../components/LegacyCard';
import type { PlayerSeason } from '@dynasty-os/core-types';

type Filter = {
  position: string;
  era: string; // decade e.g. "2020s"
  award: string;
};

function getEra(year: number | undefined): string | null {
  if (!year) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

export function LegendsPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { players } = usePlayerStore();

  const [allSeasons, setAllSeasons] = useState<PlayerSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({ position: '', era: '', award: '' });

  // Single bulk load — partition in memory
  useEffect(() => {
    if (!activeDynasty) return;
    setLoading(true);
    getPlayerSeasonsByDynasty(activeDynasty.id)
      .then((seasons) => {
        setAllSeasons(seasons);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeDynasty?.id]);

  // Departed players only
  const departedPlayers = useMemo(
    () => players.filter((p) => p.status !== 'active'),
    [players]
  );

  // Build a seasons-per-player map
  const seasonsByPlayer = useMemo(() => {
    const map: Record<string, PlayerSeason[]> = {};
    for (const season of allSeasons) {
      if (!map[season.playerId]) map[season.playerId] = [];
      map[season.playerId].push(season);
    }
    return map;
  }, [allSeasons]);

  // Build LegacyCardData for each departed player, injecting blurb from localStorage
  const allCards: LegacyCardData[] = useMemo(() => {
    return departedPlayers.map((player) => {
      const seasons = seasonsByPlayer[player.id] ?? [];
      const cardData = buildLegacyCardData(player, seasons);
      const blurb = localStorage.getItem(`legacy-blurb-${player.id}`) ?? undefined;
      return { ...cardData, blurb };
    });
  }, [departedPlayers, seasonsByPlayer]);

  // Derive available filter options from actual data
  const positions = useMemo(
    () => Array.from(new Set(departedPlayers.map((p) => p.position))).sort(),
    [departedPlayers]
  );

  const eras = useMemo(() => {
    const eraSet = new Set<string>();
    for (const p of departedPlayers) {
      const era = getEra(p.departureYear);
      if (era) eraSet.add(era);
    }
    return Array.from(eraSet).sort();
  }, [departedPlayers]);

  const awards = useMemo(() => {
    const awardSet = new Set<string>();
    for (const card of allCards) {
      for (const a of card.careerAwards) awardSet.add(a);
    }
    return Array.from(awardSet).sort();
  }, [allCards]);

  // Apply filters
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      if (filter.position && card.player.position !== filter.position) return false;
      if (filter.era) {
        const era = getEra(card.player.departureYear);
        if (era !== filter.era) return false;
      }
      if (filter.award && !card.careerAwards.includes(filter.award)) return false;
      return true;
    });
  }, [allCards, filter]);

  if (!activeDynasty) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useNavigationStore.getState().goToDashboard()}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold tracking-tight">Program Legends</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {departedPlayers.length} legend{departedPlayers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      {/* Filters */}
      {(positions.length > 0 || eras.length > 0 || awards.length > 0) && (
        <div className="border-b border-gray-800 bg-gray-800/30 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Filter:</span>

            {positions.length > 0 && (
              <select
                value={filter.position}
                onChange={(e) => setFilter((f) => ({ ...f, position: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">All Positions</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            )}

            {eras.length > 0 && (
              <select
                value={filter.era}
                onChange={(e) => setFilter((f) => ({ ...f, era: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">All Eras</option>
                {eras.map((era) => (
                  <option key={era} value={era}>{era}</option>
                ))}
              </select>
            )}

            {awards.length > 0 && (
              <select
                value={filter.award}
                onChange={(e) => setFilter((f) => ({ ...f, award: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">All Awards</option>
                {awards.map((award) => (
                  <option key={award} value={award}>{award}</option>
                ))}
              </select>
            )}

            {(filter.position || filter.era || filter.award) && (
              <button
                onClick={() => setFilter({ position: '', era: '', award: '' })}
                className="text-gray-400 hover:text-white text-xs underline transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading legends...</span>
          </div>
        )}

        {!loading && departedPlayers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-gray-300 font-semibold text-lg mb-2">No Legends Yet</h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Record a player's departure from their profile to see their Legacy Card here.
            </p>
          </div>
        )}

        {!loading && departedPlayers.length > 0 && filteredCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 text-sm">No legends match the current filters.</p>
            <button
              onClick={() => setFilter({ position: '', era: '', award: '' })}
              className="mt-2 text-amber-400 hover:text-amber-300 text-sm transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && filteredCards.length > 0 && (
          <div className="flex flex-wrap gap-6 justify-start">
            {filteredCards.map((card) => (
              <button
                key={card.player.id}
                onClick={() => useNavigationStore.getState().goToPlayerProfile(card.player.id)}
                className="block text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-2xl"
                title={`View ${card.player.firstName} ${card.player.lastName}'s profile`}
              >
                <LegacyCard cardData={card} teamName={activeDynasty.teamName} />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
