import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDynastyStore } from '../store';
import { useRecruitingStore } from '../store/recruiting-store';
import { useNavigationStore } from '../store/navigation-store';
import type { RecruitingClass } from '@dynasty-os/core-types';

// Convert letter grade to numeric score for chart
function gradeToScore(grade: string | undefined): number {
  if (!grade) return 0;
  const map: Record<string, number> = {
    'A+': 100,
    'A': 95,
    'A-': 90,
    'B+': 85,
    'B': 80,
    'B-': 75,
    'C+': 70,
    'C': 65,
    'C-': 60,
    'D+': 55,
    'D': 50,
    'D-': 45,
    'F': 30,
  };
  return map[grade.trim()] ?? 0;
}

function gradeColor(grade: string): string {
  const letter = grade.charAt(0).toUpperCase();
  if (letter === 'A') return 'text-green-400';
  if (letter === 'B') return 'text-blue-400';
  if (letter === 'C') return 'text-yellow-400';
  return 'text-red-400';
}

// Custom tooltip for the bar chart
interface TooltipPayloadItem {
  payload: { year: number; grade?: string; score: number };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
      <div className="font-bold text-sm mb-1">{data.year} Class</div>
      {data.grade ? (
        <div className={`font-bold text-base ${gradeColor(data.grade)}`}>{data.grade}</div>
      ) : (
        <div className="text-gray-500">No grade</div>
      )}
      <div className="text-gray-400 text-xs">Score: {data.score}</div>
    </div>
  );
}

export function RecruitingComparisonPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { classes, loading, loadClasses } = useRecruitingStore();

  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  useEffect(() => {
    if (activeDynasty && classes.length === 0) {
      loadClasses(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // CFB-only guard
  if (!activeDynasty) return null;
  if (activeDynasty.sport !== 'cfb') return null;

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.year - b.year),
    [classes]
  );

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      }
      if (prev.length >= 4) return prev; // max 4
      return [...prev, year].sort();
    });
  };

  const selectedClasses = useMemo(
    () => sortedClasses.filter((c) => selectedYears.includes(c.year)),
    [sortedClasses, selectedYears]
  );

  const chartData = useMemo(
    () =>
      selectedClasses.map((c) => ({
        year: c.year,
        grade: c.aiGrade,
        score: gradeToScore(c.aiGrade),
      })),
    [selectedClasses]
  );

  // Get star badge label
  const starLabel = (cls: RecruitingClass) =>
    `${cls.fiveStars}★★★★★ / ${cls.fourStars}★★★★ / ${cls.threeStars}★★★`;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => useNavigationStore.getState().goToDashboard()}
            className="text-gray-400 hover:text-white transition-colors mr-1"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Recruiting Comparison</h1>
            <p className="text-sm text-gray-400">
              {activeDynasty.teamName} &mdash; Compare class grades season-by-season
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Loading recruiting classes...</span>
          </div>
        )}

        {!loading && sortedClasses.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">No recruiting classes logged yet.</p>
              <p className="text-gray-500 text-xs">
                Log classes on the{' '}
                <button
                  onClick={() => useNavigationStore.getState().goToRecruiting()}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Recruiting page
                </button>
                .
              </p>
            </div>
          </div>
        )}

        {!loading && sortedClasses.length > 0 && (
          <>
            {/* Season selector */}
            <div className="bg-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Select Seasons to Compare
                </h2>
                <span className="text-xs text-gray-500">
                  {selectedYears.length}/4 selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedClasses.map((cls) => {
                  const isSelected = selectedYears.includes(cls.year);
                  const isDisabled = !isSelected && selectedYears.length >= 4;
                  return (
                    <button
                      key={cls.year}
                      onClick={() => !isDisabled && toggleYear(cls.year)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                        ${isSelected
                          ? 'bg-blue-900/40 border-blue-500 text-blue-300'
                          : isDisabled
                          ? 'bg-gray-700/30 border-gray-700 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-white'
                        }`}
                    >
                      <span>{cls.year}</span>
                      {cls.aiGrade && (
                        <span className={`text-xs font-bold ${gradeColor(cls.aiGrade)}`}>
                          {cls.aiGrade}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedYears.length < 2 && sortedClasses.length >= 2 && (
                <p className="text-xs text-gray-500 mt-3">
                  Select at least 2 seasons to see the comparison chart.
                </p>
              )}
            </div>

            {/* Comparison panel */}
            {selectedClasses.length >= 1 && (
              <>
                {/* Bar chart */}
                <div className="bg-gray-800 rounded-lg p-5">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                    Class Grade Comparison
                  </h2>
                  {selectedClasses.some((c) => c.aiGrade) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                      No AI grades yet. Generate grades from the Recruiting page to see chart.
                    </div>
                  )}
                </div>

                {/* Season cards */}
                <div
                  className={`grid gap-4 ${
                    selectedClasses.length === 1
                      ? 'grid-cols-1'
                      : selectedClasses.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : selectedClasses.length === 3
                      ? 'grid-cols-1 sm:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  }`}
                >
                  {selectedClasses.map((cls) => (
                    <div
                      key={cls.year}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-white">{cls.year}</span>
                        {cls.aiGrade ? (
                          <span
                            className={`text-base font-black px-2 py-0.5 rounded ${gradeColor(cls.aiGrade)} bg-gray-700`}
                          >
                            {cls.aiGrade}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">No grade</span>
                        )}
                      </div>

                      {/* Star counts */}
                      <div className="flex flex-col gap-1 mb-3 text-sm">
                        <div className="flex justify-between text-gray-400">
                          <span>5-Star</span>
                          <span className="text-yellow-400 font-semibold">{cls.fiveStars}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>4-Star</span>
                          <span className="text-amber-300 font-semibold">{cls.fourStars}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>3-Star</span>
                          <span className="text-gray-300 font-semibold">{cls.threeStars}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 pt-1 border-t border-gray-700 mt-1">
                          <span>Total Commits</span>
                          <span className="text-white font-semibold">{cls.totalCommits}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Class Rank</span>
                          <span className="text-blue-400 font-semibold">#{cls.classRank}</span>
                        </div>
                      </div>

                      {/* AI analysis snippet */}
                      {cls.aiAnalysis && (
                        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                          {cls.aiAnalysis}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
