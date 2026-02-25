import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useCoachingStaffStore } from '../store/coaching-staff-store';
import { useNavigationStore } from '../store/navigation-store';
import type { CoachingRole, CoachingStaff } from '@dynasty-os/core-types';

const ROLE_OPTIONS: { value: CoachingRole; label: string }[] = [
  { value: 'head-coach', label: 'Head Coach' },
  { value: 'offensive-coordinator', label: 'Offensive Coordinator' },
  { value: 'defensive-coordinator', label: 'Defensive Coordinator' },
  { value: 'special-teams', label: 'Special Teams' },
  { value: 'position-coach', label: 'Position Coach' },
  { value: 'other', label: 'Other' },
];

function roleLabel(role: CoachingRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

const CURRENT_YEAR = new Date().getFullYear();

interface AddCoachFormState {
  name: string;
  role: CoachingRole;
  hireYear: number;
  schemeNotes: string;
}

const EMPTY_FORM: AddCoachFormState = {
  name: '',
  role: 'position-coach',
  hireYear: CURRENT_YEAR,
  schemeNotes: '',
};

export function CoachingStaffPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { staff, loading, loadStaff, addCoach, removeCoach, fireCoach, promoteCoach } =
    useCoachingStaffStore();
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const [form, setForm] = useState<AddCoachFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Fire inline state: coachId -> fireYear input value
  const [firingId, setFiringId] = useState<string | null>(null);
  const [fireYearInput, setFireYearInput] = useState<number>(CURRENT_YEAR);

  // Promote inline state: coachId -> selected new role
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteRole, setPromoteRole] = useState<CoachingRole>('head-coach');

  const [historyOpen, setHistoryOpen] = useState(true);

  useEffect(() => {
    if (!activeDynasty) return;
    loadStaff(activeDynasty.id);
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  const activeStaff = staff.filter((c) => c.fireYear == null);
  const firedStaff = staff.filter((c) => c.fireYear != null);

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setFormError(null);
    await addCoach(
      {
        dynastyId: activeDynasty.id,
        name: form.name.trim(),
        role: form.role,
        hireYear: form.hireYear,
        schemeNotes: form.schemeNotes.trim() || undefined,
      },
      activeDynasty.id
    );
    setForm(EMPTY_FORM);
  };

  const handleFireClick = (coach: CoachingStaff) => {
    setFiringId(coach.id);
    setFireYearInput(CURRENT_YEAR);
    setPromotingId(null);
  };

  const handleFireConfirm = async (coach: CoachingStaff) => {
    await fireCoach(coach.id, fireYearInput, activeDynasty.id);
    setFiringId(null);
  };

  const handlePromoteClick = (coach: CoachingStaff) => {
    setPromotingId(coach.id);
    setPromoteRole(coach.role);
    setFiringId(null);
  };

  const handlePromoteConfirm = async (coach: CoachingStaff) => {
    await promoteCoach(coach.id, promoteRole, activeDynasty.id);
    setPromotingId(null);
  };

  const handleDelete = async (coach: CoachingStaff) => {
    await removeCoach(coach.id, activeDynasty.id);
  };

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
          <h1 className="text-xl font-bold tracking-tight">Coaching Staff</h1>
          <span className="text-sm text-gray-400">{activeDynasty.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Add Coach Form */}
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-base font-semibold text-gray-200 mb-4">Hire Coach</h2>
            <form onSubmit={handleAddCoach} className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setFormError(null);
                  }}
                  placeholder="Coach Name"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CoachingRole }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Hire Year */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Hire Year</label>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={form.hireYear}
                  onChange={(e) => setForm((f) => ({ ...f, hireYear: parseInt(e.target.value, 10) || CURRENT_YEAR }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Scheme Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Scheme Notes <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={form.schemeNotes}
                  onChange={(e) => setForm((f) => ({ ...f, schemeNotes: e.target.value }))}
                  placeholder="e.g. Air Raid offense, 4-2-5 defense"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="w-full px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Hiring...' : 'Hire Coach'}
              </button>
            </form>
          </div>

          {/* Staff List Panel */}
          <div className="flex flex-col gap-4">

            {/* Active Staff */}
            <div className="bg-gray-800 rounded-lg p-5">
              <h2 className="text-base font-semibold text-gray-200 mb-3">
                Active Staff
                {activeStaff.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({activeStaff.length})
                  </span>
                )}
              </h2>

              {activeStaff.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No active coaches. Hire your first coach using the form.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeStaff.map((coach) => (
                    <div key={coach.id} className="border border-gray-700 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm truncate">{coach.name}</div>
                          <div className="text-xs text-amber-400 mt-0.5">{roleLabel(coach.role)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Hired: {coach.hireYear}</div>
                          {coach.schemeNotes && (
                            <div className="text-xs text-gray-400 mt-1 italic">
                              {coach.schemeNotes}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleFireClick(coach)}
                            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white transition-colors"
                          >
                            Fire
                          </button>
                          <button
                            onClick={() => handlePromoteClick(coach)}
                            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-blue-800 text-gray-300 hover:text-white transition-colors"
                          >
                            Promote
                          </button>
                          <button
                            onClick={() => handleDelete(coach)}
                            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Fire inline UI */}
                      {firingId === coach.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-400 mb-2">Enter the year this coach was fired:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={coach.hireYear}
                              max={2100}
                              value={fireYearInput}
                              onChange={(e) => setFireYearInput(parseInt(e.target.value, 10) || CURRENT_YEAR)}
                              className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleFireConfirm(coach)}
                              className="text-xs px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded font-semibold transition-colors"
                            >
                              Confirm Fire
                            </button>
                            <button
                              onClick={() => setFiringId(null)}
                              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Promote inline UI */}
                      {promotingId === coach.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-400 mb-2">Select new role:</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={promoteRole}
                              onChange={(e) => setPromoteRole(e.target.value as CoachingRole)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handlePromoteConfirm(coach)}
                              className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded font-semibold transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setPromotingId(null)}
                              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff History (collapsible) */}
            {firedStaff.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-5">
                <button
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setHistoryOpen((o) => !o)}
                >
                  <h2 className="text-base font-semibold text-gray-200">
                    Staff History
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({firedStaff.length})
                    </span>
                  </h2>
                  <svg
                    className={`w-4 h-4 text-gray-500 ml-auto transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {historyOpen && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                          <th className="pb-2 text-left font-medium">Name</th>
                          <th className="pb-2 text-left font-medium">Role</th>
                          <th className="pb-2 text-right font-medium">Hired</th>
                          <th className="pb-2 text-right font-medium">Fired</th>
                        </tr>
                      </thead>
                      <tbody>
                        {firedStaff.map((coach) => (
                          <tr key={coach.id} className="border-b border-gray-700/50 last:border-0">
                            <td className="py-2 text-gray-300">{coach.name}</td>
                            <td className="py-2 text-gray-400">{roleLabel(coach.role)}</td>
                            <td className="py-2 text-right text-gray-500">{coach.hireYear}</td>
                            <td className="py-2 text-right text-red-400">{coach.fireYear}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
