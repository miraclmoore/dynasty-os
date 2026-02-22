import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useRecruitingStore } from '../store/recruiting-store';
import { useNavigationStore } from '../store/navigation-store';
import type { RecruitingClass } from '@dynasty-os/core-types';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C', 'DL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'ATH'];

type ViewMode = 'entry' | 'history';

function gradeColor(grade: string): string {
  const letter = grade.charAt(0).toUpperCase();
  if (letter === 'A') return 'text-green-400 bg-green-900/30 border-green-700';
  if (letter === 'B') return 'text-blue-400 bg-blue-900/30 border-blue-700';
  if (letter === 'C') return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
  return 'text-red-400 bg-red-900/30 border-red-700';
}

interface RecruitFormData {
  name: string;
  position: string;
  stars: number;
  state: string;
  nationalRank: string;
}

const defaultRecruitForm: RecruitFormData = {
  name: '',
  position: 'QB',
  stars: 3,
  state: '',
  nationalRank: '',
};

interface ClassFormData {
  classRank: string;
  fiveStars: string;
  fourStars: string;
  threeStars: string;
  totalCommits: string;
}

const defaultClassForm: ClassFormData = {
  classRank: '',
  fiveStars: '0',
  fourStars: '0',
  threeStars: '0',
  totalCommits: '',
};

export function RecruitingPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason } = useSeasonStore();
  const {
    classes,
    recruitsForClass,
    activeClass,
    loading,
    loadClasses,
    loadRecruitsForClass,
    createClass,
    deleteClass,
    addRecruit,
    removeRecruit,
    generateGrade,
    setActiveClass,
  } = useRecruitingStore();

  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const [viewMode, setViewMode] = useState<ViewMode>('entry');
  const [classForm, setClassForm] = useState<ClassFormData>(defaultClassForm);
  const [recruitForm, setRecruitForm] = useState<RecruitFormData>(defaultRecruitForm);
  const [generatingGrade, setGeneratingGrade] = useState(false);

  // Load classes on mount
  useEffect(() => {
    if (activeDynasty) {
      loadClasses(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // Auto-select the class for the active season when classes load
  useEffect(() => {
    if (!activeSeason || classes.length === 0) return;
    const currentSeasonClass = classes.find((c) => c.seasonId === activeSeason.id);
    if (currentSeasonClass && !activeClass) {
      setActiveClass(currentSeasonClass);
      loadRecruitsForClass(currentSeasonClass.id);
    }
  }, [classes, activeSeason?.id]);

  if (!activeDynasty) return null;

  // CFB-only guard
  if (activeDynasty.sport !== 'cfb') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-bold text-gray-200 mb-3">CFB Only Feature</h2>
          <p className="text-gray-400 text-sm mb-6">
            Recruiting is only available for College Football dynasties.
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

  const currentSeasonClass = activeSeason
    ? classes.find((c) => c.seasonId === activeSeason.id)
    : null;

  // Auto-calculate total commits from star counts
  const autoTotalCommits =
    (parseInt(classForm.fiveStars, 10) || 0) +
    (parseInt(classForm.fourStars, 10) || 0) +
    (parseInt(classForm.threeStars, 10) || 0);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDynasty || !activeSeason) return;

    const fiveStars = parseInt(classForm.fiveStars, 10) || 0;
    const fourStars = parseInt(classForm.fourStars, 10) || 0;
    const threeStars = parseInt(classForm.threeStars, 10) || 0;
    const totalCommits = classForm.totalCommits
      ? parseInt(classForm.totalCommits, 10)
      : fiveStars + fourStars + threeStars;

    const newClass = await createClass({
      dynastyId: activeDynasty.id,
      seasonId: activeSeason.id,
      year: activeSeason.year,
      classRank: parseInt(classForm.classRank, 10) || 0,
      totalCommits,
      fiveStars,
      fourStars,
      threeStars,
    });

    setClassForm(defaultClassForm);
    setActiveClass(newClass);
    await loadRecruitsForClass(newClass.id);
  };

  const handleSelectHistoryClass = (cls: RecruitingClass) => {
    setActiveClass(cls);
    loadRecruitsForClass(cls.id);
    setViewMode('entry');
  };

  const handleAddRecruit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDynasty || !activeClass) return;
    if (!recruitForm.name.trim()) return;

    await addRecruit({
      dynastyId: activeDynasty.id,
      classId: activeClass.id,
      name: recruitForm.name.trim(),
      position: recruitForm.position,
      stars: recruitForm.stars,
      state: recruitForm.state.trim() || undefined,
      nationalRank: recruitForm.nationalRank ? parseInt(recruitForm.nationalRank, 10) : undefined,
    });

    setRecruitForm(defaultRecruitForm);
  };

  const handleGenerateGrade = async () => {
    if (!activeDynasty || !activeClass) return;
    setGeneratingGrade(true);
    await generateGrade(activeClass.id, activeDynasty.id);
    setGeneratingGrade(false);
  };

  const displayClass = activeClass;
  const showClassCreation = !currentSeasonClass && !activeClass;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToDashboard}
              className="text-gray-400 hover:text-white transition-colors mr-1"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold tracking-tight">Recruiting</h1>
            <span className="text-sm text-gray-400">{activeDynasty.name}</span>
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('entry')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'entry'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Current Class
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'history'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Class History
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* ENTRY VIEW */}
        {viewMode === 'entry' && (
          <div className="flex flex-col gap-6">
            {/* Class creation form — only shown if no class exists for active season */}
            {showClassCreation && activeSeason && (
              <div className="bg-gray-800 rounded-lg p-5">
                <h2 className="text-base font-semibold text-gray-200 mb-4">
                  Create {activeSeason.year} Recruiting Class
                </h2>
                <form onSubmit={handleCreateClass} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Class Rank
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={135}
                        required
                        value={classForm.classRank}
                        onChange={(e) => setClassForm((f) => ({ ...f, classRank: e.target.value }))}
                        placeholder="e.g. 5"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Total Commits (auto-calculated if left blank)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={classForm.totalCommits}
                        onChange={(e) => setClassForm((f) => ({ ...f, totalCommits: e.target.value }))}
                        placeholder={String(autoTotalCommits)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">5-Star Recruits</label>
                      <input
                        type="number"
                        min={0}
                        value={classForm.fiveStars}
                        onChange={(e) => setClassForm((f) => ({ ...f, fiveStars: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">4-Star Recruits</label>
                      <input
                        type="number"
                        min={0}
                        value={classForm.fourStars}
                        onChange={(e) => setClassForm((f) => ({ ...f, fourStars: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">3-Star Recruits</label>
                      <input
                        type="number"
                        min={0}
                        value={classForm.threeStars}
                        onChange={(e) => setClassForm((f) => ({ ...f, threeStars: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Class'}
                  </button>
                </form>
              </div>
            )}

            {/* No active season message */}
            {!activeSeason && !displayClass && (
              <div className="text-center py-12 text-gray-500 text-sm">
                No active season found. Start a season from the dashboard first.
              </div>
            )}

            {/* Active class panel */}
            {displayClass && (
              <>
                <div className="bg-gray-800 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-200">
                        {displayClass.year} Recruiting Class
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activeDynasty.teamName}
                      </p>
                    </div>
                    {displayClass.id !== currentSeasonClass?.id && (
                      <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700 px-2 py-1 rounded">
                        Historical
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">#{displayClass.classRank}</div>
                      <div className="text-xs text-gray-400 mt-1">Class Rank</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{displayClass.totalCommits}</div>
                      <div className="text-xs text-gray-400 mt-1">Total Commits</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">
                        <span className="text-yellow-400">{displayClass.fiveStars}</span>
                        <span className="text-gray-500 text-sm"> / </span>
                        <span className="text-amber-300">{displayClass.fourStars}</span>
                        <span className="text-gray-500 text-sm"> / </span>
                        <span className="text-gray-300">{displayClass.threeStars}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">5 / 4 / 3 Stars</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{recruitsForClass.length}</div>
                      <div className="text-xs text-gray-400 mt-1">Logged Recruits</div>
                    </div>
                  </div>

                  {/* AI Grade Section */}
                  {displayClass.aiGrade ? (
                    <div className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`text-4xl font-black px-4 py-2 rounded-lg border ${gradeColor(displayClass.aiGrade)}`}
                        >
                          {displayClass.aiGrade}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Signing Day Analysis
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {displayClass.aiAnalysis}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateGrade}
                      disabled={generatingGrade || loading}
                      className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {generatingGrade ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating Analysis...
                        </>
                      ) : (
                        'Generate Signing Day Grade'
                      )}
                    </button>
                  )}
                </div>

                {/* Recruit log */}
                <div className="bg-gray-800 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Recruit Log
                  </h3>

                  {/* Add recruit form */}
                  <form onSubmit={handleAddRecruit} className="grid grid-cols-6 gap-2 mb-4">
                    <input
                      type="text"
                      required
                      value={recruitForm.name}
                      onChange={(e) => setRecruitForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Recruit Name"
                      className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                    <select
                      value={recruitForm.position}
                      onChange={(e) => setRecruitForm((f) => ({ ...f, position: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                    <select
                      value={recruitForm.stars}
                      onChange={(e) => setRecruitForm((f) => ({ ...f, stars: parseInt(e.target.value, 10) }))}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {[5, 4, 3, 2, 1].map((s) => (
                        <option key={s} value={s}>{s} Star</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={recruitForm.state}
                      onChange={(e) => setRecruitForm((f) => ({ ...f, state: e.target.value }))}
                      placeholder="State"
                      maxLength={2}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={recruitForm.nationalRank}
                        onChange={(e) => setRecruitForm((f) => ({ ...f, nationalRank: e.target.value }))}
                        placeholder="Nat'l #"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  {/* Recruits table */}
                  {recruitsForClass.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recruits logged yet. Add recruits above.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                            <th className="text-left py-2 pr-4">Name</th>
                            <th className="text-left py-2 pr-4">Position</th>
                            <th className="text-left py-2 pr-4">Stars</th>
                            <th className="text-left py-2 pr-4">State</th>
                            <th className="text-left py-2 pr-4">Nat'l Rank</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recruitsForClass.map((recruit) => (
                            <tr
                              key={recruit.id}
                              className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                            >
                              <td className="py-2 pr-4 font-medium text-gray-200">{recruit.name}</td>
                              <td className="py-2 pr-4 text-gray-400">{recruit.position}</td>
                              <td className="py-2 pr-4">
                                <span className="text-yellow-400">
                                  {'★'.repeat(recruit.stars)}
                                  <span className="text-gray-600">{'★'.repeat(5 - recruit.stars)}</span>
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-gray-400">{recruit.state ?? '—'}</td>
                              <td className="py-2 pr-4 text-gray-400">
                                {recruit.nationalRank != null ? `#${recruit.nationalRank}` : '—'}
                              </td>
                              <td className="py-2 text-right">
                                <button
                                  onClick={() => removeRecruit(recruit.id, displayClass.id)}
                                  className="text-gray-600 hover:text-red-400 transition-colors"
                                  aria-label="Remove recruit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY VIEW */}
        {viewMode === 'history' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-300">
              Recruiting Class History
            </h2>

            {classes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No recruiting classes logged yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleSelectHistoryClass(cls)}
                    className="bg-gray-800 rounded-lg p-4 text-left hover:bg-gray-700/80 transition-colors border border-gray-700 hover:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-white">{cls.year}</span>
                      {cls.aiGrade && (
                        <span
                          className={`text-sm font-black px-2 py-0.5 rounded border ${gradeColor(cls.aiGrade)}`}
                        >
                          {cls.aiGrade}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400 mb-2">
                      <span>Rank <span className="text-gray-200 font-medium">#{cls.classRank}</span></span>
                      <span>{cls.totalCommits} commits</span>
                      <span>
                        <span className="text-yellow-400">{cls.fiveStars}</span>
                        {' / '}
                        <span className="text-amber-300">{cls.fourStars}</span>
                        {' / '}
                        <span className="text-gray-300">{cls.threeStars}</span>
                        {' stars'}
                      </span>
                    </div>
                    {cls.aiAnalysis && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {cls.aiAnalysis.split('.')[0]}.
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
