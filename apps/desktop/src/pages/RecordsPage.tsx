import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDynastyStore } from '../store';
import { useNavigationStore } from '../store/navigation-store';
import { getSportConfig } from '@dynasty-os/sport-configs';
import { db } from '@dynasty-os/db';
import type { Season } from '@dynasty-os/core-types';
import {
  getSingleSeasonLeaders,
  getCareerLeaders,
  getHeadToHeadRecords,
  type LeaderboardEntry,
  type HeadToHeadRecord,
} from '../lib/records-service';
import { RecordsLeaderboard } from '../components/RecordsLeaderboard';
import { HeadToHeadRecords } from '../components/HeadToHeadRecords';

type Tab = 'single-season' | 'career' | 'h2h';

export function RecordsPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const [activeTab, setActiveTab] = useState<Tab>('single-season');
  const [loading, setLoading] = useState(false);

  // Seasons for season-filter dropdown
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);

  // Single-season tab state
  const [selectedStatKey, setSelectedStatKey] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(''); // '' = all seasons
  const [singleSeasonEntries, setSingleSeasonEntries] = useState<LeaderboardEntry[]>([]);

  // Career tab state
  const [careerStatKey, setCareerStatKey] = useState<string>('');
  const [careerEntries, setCareerEntries] = useState<LeaderboardEntry[]>([]);

  // H2H tab state
  const [h2hStartYear, setH2hStartYear] = useState<string>(''); // '' = no filter
  const [h2hEndYear, setH2hEndYear] = useState<string>('');
  const [h2hRecords, setH2hRecords] = useState<HeadToHeadRecord[]>([]);

  if (!activeDynasty) return null;

  const sportConfig = getSportConfig(activeDynasty.sport);
  const statCategories = sportConfig.statCategories;

  // Load all seasons on mount for dropdown + era ranges
  useEffect(() => {
    db.seasons
      .where('dynastyId')
      .equals(activeDynasty.id)
      .toArray()
      .then((seasons) => {
        const sorted = [...seasons].sort((a, b) => b.year - a.year);
        setAllSeasons(sorted);
      })
      .catch(console.error);
  }, [activeDynasty.id]);

  // Derive decade ranges from dynasty seasons for H2H era filter
  const decadeOptions = useMemo(() => {
    if (allSeasons.length === 0) return [];
    const decades = new Set<number>();
    for (const s of allSeasons) {
      decades.add(Math.floor(s.year / 10) * 10);
    }
    return Array.from(decades).sort((a, b) => a - b);
  }, [allSeasons]);

  // Initialize default stat keys when sportConfig loads
  useEffect(() => {
    if (statCategories.length > 0 && !selectedStatKey) {
      setSelectedStatKey(statCategories[0].key);
    }
    if (statCategories.length > 0 && !careerStatKey) {
      setCareerStatKey(statCategories[0].key);
    }
  }, [statCategories]);

  // Load single-season leaders
  const loadSingleSeason = useCallback(async () => {
    if (!selectedStatKey || !activeDynasty) return;
    setLoading(true);
    try {
      const entries = await getSingleSeasonLeaders(
        activeDynasty.id,
        selectedStatKey,
        10,
        selectedSeasonId || undefined
      );
      setSingleSeasonEntries(entries);
    } catch (err) {
      console.error('Failed to load single-season leaders:', err);
      setSingleSeasonEntries([]);
    } finally {
      setLoading(false);
    }
  }, [activeDynasty.id, selectedStatKey, selectedSeasonId]);

  // Load career leaders
  const loadCareer = useCallback(async () => {
    if (!careerStatKey || !activeDynasty) return;
    setLoading(true);
    try {
      const entries = await getCareerLeaders(activeDynasty.id, careerStatKey, 10);
      setCareerEntries(entries);
    } catch (err) {
      console.error('Failed to load career leaders:', err);
      setCareerEntries([]);
    } finally {
      setLoading(false);
    }
  }, [activeDynasty.id, careerStatKey]);

  // Load H2H records
  const loadH2H = useCallback(async () => {
    if (!activeDynasty) return;
    setLoading(true);
    try {
      const options: { startYear?: number; endYear?: number } = {};
      if (h2hStartYear) options.startYear = parseInt(h2hStartYear, 10);
      if (h2hEndYear) options.endYear = parseInt(h2hEndYear, 10);
      const records = await getHeadToHeadRecords(activeDynasty.id, options);
      setH2hRecords(records);
    } catch (err) {
      console.error('Failed to load H2H records:', err);
      setH2hRecords([]);
    } finally {
      setLoading(false);
    }
  }, [activeDynasty.id, h2hStartYear, h2hEndYear]);

  // Load data on tab switch or filter change
  useEffect(() => {
    if (activeTab === 'single-season' && selectedStatKey) {
      loadSingleSeason();
    }
  }, [activeTab, selectedStatKey, selectedSeasonId]);

  useEffect(() => {
    if (activeTab === 'career' && careerStatKey) {
      loadCareer();
    }
  }, [activeTab, careerStatKey]);

  useEffect(() => {
    if (activeTab === 'h2h') {
      loadH2H();
    }
  }, [activeTab, h2hStartYear, h2hEndYear]);

  const selectedStatLabel =
    statCategories.find((c) => c.key === selectedStatKey)?.label ?? selectedStatKey;
  const careerStatLabel =
    statCategories.find((c) => c.key === careerStatKey)?.label ?? careerStatKey;

  const TAB_STYLES = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tab
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToDashboard}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold tracking-tight">
              Records &amp; Leaderboards
            </h1>
          </div>
          <div className="text-sm text-gray-500">{activeDynasty.name}</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          <button className={TAB_STYLES('single-season')} onClick={() => setActiveTab('single-season')}>
            Single-Season
          </button>
          <button className={TAB_STYLES('career')} onClick={() => setActiveTab('career')}>
            Career
          </button>
          <button className={TAB_STYLES('h2h')} onClick={() => setActiveTab('h2h')}>
            Head-to-Head
          </button>
        </div>

        {/* Single-Season Tab */}
        {activeTab === 'single-season' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              {/* Stat dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Stat</label>
                <select
                  value={selectedStatKey}
                  onChange={(e) => setSelectedStatKey(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md px-3 py-1.5 min-w-[180px]"
                >
                  {statCategories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Season</label>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md px-3 py-1.5 min-w-[140px]"
                >
                  <option value="">All Seasons</option>
                  {allSeasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-base font-semibold text-gray-200 mb-4">
              Top 10 — {selectedStatLabel}
              {selectedSeasonId
                ? ` (${allSeasons.find((s) => s.id === selectedSeasonId)?.year ?? ''})`
                : ' (All Seasons)'}
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : (
              <RecordsLeaderboard
                entries={singleSeasonEntries}
                statLabel={selectedStatLabel}
                showYear={true}
              />
            )}
          </div>
        )}

        {/* Career Tab */}
        {activeTab === 'career' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              {/* Stat dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Stat</label>
                <select
                  value={careerStatKey}
                  onChange={(e) => setCareerStatKey(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md px-3 py-1.5 min-w-[180px]"
                >
                  {statCategories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-base font-semibold text-gray-200 mb-4">
              Career Top 10 — {careerStatLabel}
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : (
              <RecordsLeaderboard
                entries={careerEntries}
                statLabel={careerStatLabel}
                showYear={false}
              />
            )}
          </div>
        )}

        {/* Head-to-Head Tab */}
        {activeTab === 'h2h' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              {/* Era filter: start year */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider">From Year</label>
                <select
                  value={h2hStartYear}
                  onChange={(e) => setH2hStartYear(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md px-3 py-1.5 min-w-[120px]"
                >
                  <option value="">All Time</option>
                  {decadeOptions.map((decade) => (
                    <option key={decade} value={String(decade)}>
                      {decade}
                    </option>
                  ))}
                  {allSeasons.map((s) => (
                    <option key={s.id} value={String(s.year)}>
                      {s.year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Era filter: end year */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wider">To Year</label>
                <select
                  value={h2hEndYear}
                  onChange={(e) => setH2hEndYear(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md px-3 py-1.5 min-w-[120px]"
                >
                  <option value="">All Time</option>
                  {allSeasons.map((s) => (
                    <option key={s.id} value={String(s.year)}>
                      {s.year}
                    </option>
                  ))}
                </select>
              </div>

              {(h2hStartYear || h2hEndYear) && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setH2hStartYear(''); setH2hEndYear(''); }}
                    className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded border border-gray-600 transition-colors"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>

            <h2 className="text-base font-semibold text-gray-200 mb-4">
              All-Time Head-to-Head
              {(h2hStartYear || h2hEndYear) && (
                <span className="text-gray-400 font-normal text-sm ml-2">
                  ({h2hStartYear || '∞'} – {h2hEndYear || 'present'})
                </span>
              )}
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : (
              <HeadToHeadRecords records={h2hRecords} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
