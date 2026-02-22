import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { usePrestigeStore } from '../store/prestige-store';
import { useNavigationStore } from '../store/navigation-store';
import { calculatePrestigeTrend } from '../lib/prestige-service';
import type { PrestigeRating } from '@dynasty-os/core-types';

// SVG chart constants
const SVG_WIDTH = 700;
const SVG_HEIGHT = 300;
const PAD_LEFT = 50;
const PAD_RIGHT = 20;
const PAD_TOP = 20;
const PAD_BOTTOM = 40;
const CHART_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;  // 630
const CHART_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM; // 240

function ratingToY(rating: number): number {
  return PAD_TOP + ((100 - rating) / 100) * CHART_HEIGHT;
}

function rankToY(rank: number): number {
  // 1 = top (PAD_TOP), 150 = bottom (PAD_TOP + CHART_HEIGHT)
  return PAD_TOP + ((rank - 1) / (150 - 1)) * CHART_HEIGHT;
}

function dataToX(index: number, total: number): number {
  if (total <= 1) return PAD_LEFT + CHART_WIDTH / 2;
  return PAD_LEFT + (index / (total - 1)) * CHART_WIDTH;
}

interface PrestigeFormData {
  year: string;
  rating: string;
  recruitingRank: string;
}

export function PrestigeTrackerPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason } = useSeasonStore();
  const { ratings, loading, loadRatings, addRating, editRating, removeRating } = usePrestigeStore();
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const defaultYear = activeSeason?.year ?? new Date().getFullYear();

  const [form, setForm] = useState<PrestigeFormData>({
    year: String(defaultYear),
    rating: '',
    recruitingRank: '',
  });

  useEffect(() => {
    if (activeDynasty) {
      loadRatings(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // Keep form year synced with activeSeason when it changes
  useEffect(() => {
    if (activeSeason) {
      setForm((f) => ({ ...f, year: String(activeSeason.year) }));
    }
  }, [activeSeason?.year]);

  if (!activeDynasty) return null;

  // CFB-only guard
  if (activeDynasty.sport !== 'cfb') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-bold text-gray-200 mb-3">CFB Only Feature</h2>
          <p className="text-gray-400 text-sm mb-6">
            Program Prestige is only available for College Football dynasties.
          </p>
          <button
            onClick={goToDashboard}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { trend, currentRating, priorAvg } = calculatePrestigeTrend(ratings);

  // Ratings sorted descending for the table
  const ratingsSortedDesc = [...ratings].sort((a, b) => b.year - a.year);

  // Find if a rating already exists for the form's year
  const formYear = parseInt(form.year, 10);
  const existingRatingForYear = ratings.find((r) => r.year === formYear);

  // Pre-fill form when year matches existing rating
  const handleYearChange = (newYear: string) => {
    const yr = parseInt(newYear, 10);
    const existing = ratings.find((r) => r.year === yr);
    if (existing) {
      setForm({
        year: newYear,
        rating: String(existing.rating),
        recruitingRank: existing.recruitingRank != null ? String(existing.recruitingRank) : '',
      });
    } else {
      setForm((f) => ({ ...f, year: newYear, rating: '', recruitingRank: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDynasty) return;

    const ratingVal = parseInt(form.rating, 10);
    if (!form.rating || isNaN(ratingVal) || ratingVal < 1 || ratingVal > 100) return;

    const recruitingRankVal = form.recruitingRank ? parseInt(form.recruitingRank, 10) : undefined;

    if (existingRatingForYear) {
      await editRating(
        existingRatingForYear.id,
        { year: formYear, rating: ratingVal, recruitingRank: recruitingRankVal },
        activeDynasty.id
      );
    } else {
      await addRating(
        {
          dynastyId: activeDynasty.id,
          year: formYear,
          rating: ratingVal,
          recruitingRank: recruitingRankVal,
        },
        activeDynasty.id
      );
    }

    setForm({ year: String(formYear), rating: '', recruitingRank: '' });
  };

  // Trend delta for table (diff from previous year's rating)
  function getTrendDelta(rating: PrestigeRating, sortedAsc: PrestigeRating[]): number | null {
    const idx = sortedAsc.findIndex((r) => r.id === rating.id);
    if (idx <= 0) return null;
    return rating.rating - sortedAsc[idx - 1].rating;
  }

  // Ratings sorted ascending for chart and delta calculation
  const ratingsSortedAsc = [...ratings].sort((a, b) => a.year - b.year);
  const hasRecruitingRank = ratingsSortedAsc.some((r) => r.recruitingRank != null);

  // Build SVG polyline points
  const total = ratingsSortedAsc.length;
  const prestigePoints = ratingsSortedAsc
    .map((r, i) => `${dataToX(i, total)},${ratingToY(r.rating)}`)
    .join(' ');

  const rankPoints = hasRecruitingRank
    ? ratingsSortedAsc
        .filter((r) => r.recruitingRank != null)
        .map((r, i, arr) => {
          // Find original index in full sorted array for correct X position
          const origIdx = ratingsSortedAsc.findIndex((orig) => orig.id === r.id);
          return `${dataToX(origIdx, total)},${rankToY(r.recruitingRank!)}`;
        })
        .join(' ')
    : '';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Program Prestige</h1>
          <span className="text-sm text-gray-400">{activeDynasty.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* Trend banner */}
        {currentRating !== null && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Current Prestige Rating
                </div>
                <div className="text-4xl font-bold text-white">{currentRating}</div>
              </div>

              <div className="flex flex-col items-start gap-1">
                {trend === 'up' && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-green-400">&#x2191;</span>
                    <span className="text-lg font-semibold text-green-400">Rising</span>
                  </div>
                )}
                {trend === 'down' && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-red-400">&#x2193;</span>
                    <span className="text-lg font-semibold text-red-400">Declining</span>
                  </div>
                )}
                {trend === 'stable' && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-gray-400">&#x2192;</span>
                    <span className="text-lg font-semibold text-gray-400">Stable</span>
                  </div>
                )}
                {priorAvg !== null && (
                  <div className="text-sm text-gray-500">
                    vs {priorAvg.toFixed(1)} avg (prior 3 seasons)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Log rating form */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-200 mb-4">
            {existingRatingForYear ? `Update ${formYear} Rating` : 'Log Prestige Rating'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
                <input
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Rating <span className="text-gray-600">(1–100)</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                  placeholder="e.g. 82"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Recruiting Rank <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={150}
                  value={form.recruitingRank}
                  onChange={(e) => setForm((f) => ({ ...f, recruitingRank: e.target.value }))}
                  placeholder="e.g. 14"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading
                ? existingRatingForYear
                  ? 'Updating...'
                  : 'Logging...'
                : existingRatingForYear
                  ? 'Update'
                  : 'Log Rating'}
            </button>
          </form>
        </div>

        {/* Ratings table */}
        {ratingsSortedDesc.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Rating History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                    <th className="text-left py-2 pr-4">Year</th>
                    <th className="text-left py-2 pr-4">Rating</th>
                    <th className="text-left py-2 pr-4">Recruiting Rank</th>
                    <th className="text-left py-2 pr-4">Trend Delta</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ratingsSortedDesc.map((r) => {
                    const delta = getTrendDelta(r, ratingsSortedAsc);
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-2 pr-4 font-medium text-gray-200">{r.year}</td>
                        <td className="py-2 pr-4 text-gray-100 font-semibold">{r.rating}</td>
                        <td className="py-2 pr-4 text-gray-400">
                          {r.recruitingRank != null ? `#${r.recruitingRank}` : '—'}
                        </td>
                        <td className="py-2 pr-4">
                          {delta === null ? (
                            <span className="text-gray-600">—</span>
                          ) : delta > 0 ? (
                            <span className="text-green-400 font-medium">+{delta}</span>
                          ) : delta < 0 ? (
                            <span className="text-red-400 font-medium">{delta}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => removeRating(r.id, activeDynasty.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                            aria-label="Delete rating"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SVG Chart */}
        {ratingsSortedAsc.length < 2 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
            Log at least 2 seasons of prestige ratings to see the trend chart.
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Prestige Trend Chart
            </h2>
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full"
              style={{ maxWidth: '700px' }}
              aria-label="Prestige rating trend chart"
            >
              {/* Grid lines at 25, 50, 75 */}
              {[25, 50, 75].map((val) => (
                <line
                  key={val}
                  x1={PAD_LEFT}
                  y1={ratingToY(val)}
                  x2={PAD_LEFT + CHART_WIDTH}
                  y2={ratingToY(val)}
                  stroke="#374151"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Y-axis grid label values */}
              {[25, 50, 75, 100].map((val) => (
                <text
                  key={val}
                  x={PAD_LEFT - 6}
                  y={ratingToY(val) + 4}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize="11"
                >
                  {val}
                </text>
              ))}

              {/* Y-axis label "Rating" rotated */}
              <text
                x={0}
                y={0}
                transform={`rotate(-90) translate(-${PAD_TOP + CHART_HEIGHT / 2}, 14)`}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="11"
              >
                Rating
              </text>

              {/* Recruiting rank polyline (amber dashed) — rendered before prestige so prestige is on top */}
              {hasRecruitingRank && rankPoints && (
                <polyline
                  points={rankPoints}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Prestige rating polyline (blue) */}
              <polyline
                points={prestigePoints}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
              />

              {/* Data points and X-axis labels */}
              {ratingsSortedAsc.map((r, i) => {
                const x = dataToX(i, total);
                const y = ratingToY(r.rating);
                return (
                  <g key={r.id}>
                    <circle cx={x} cy={y} r="4" fill="#60a5fa">
                      <title>Year: {r.year}, Rating: {r.rating}</title>
                    </circle>
                    <text
                      x={x}
                      y={SVG_HEIGHT - PAD_BOTTOM + 16}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="11"
                    >
                      {r.year}
                    </text>
                  </g>
                );
              })}

              {/* Recruiting rank dots */}
              {hasRecruitingRank &&
                ratingsSortedAsc.map((r, i) => {
                  if (r.recruitingRank == null) return null;
                  return (
                    <circle
                      key={`rank-${r.id}`}
                      cx={dataToX(i, total)}
                      cy={rankToY(r.recruitingRank)}
                      r="3"
                      fill="#f59e0b"
                    >
                      <title>Year: {r.year}, Recruiting Rank: #{r.recruitingRank}</title>
                    </circle>
                  );
                })}

              {/* Legend */}
              <g transform={`translate(${PAD_LEFT}, ${SVG_HEIGHT - 8})`}>
                <circle cx="6" cy="0" r="4" fill="#60a5fa" />
                <text x="14" y="4" fill="#9ca3af" fontSize="11">
                  Prestige Rating
                </text>
                {hasRecruitingRank && (
                  <>
                    <line
                      x1="110"
                      y1="0"
                      x2="126"
                      y2="0"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text x="130" y="4" fill="#9ca3af" fontSize="11">
                      Recruiting Rank
                    </text>
                  </>
                )}
              </g>
            </svg>
          </div>
        )}

        {/* Empty state */}
        {ratings.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No prestige ratings logged yet. Enter a year and rating above to get started.
          </div>
        )}
      </main>
    </div>
  );
}
