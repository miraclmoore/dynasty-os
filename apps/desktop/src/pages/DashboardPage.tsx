import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useGameStore } from '../store/game-store';
import { useNavigationStore } from '../store/navigation-store';
import { DynastySwitcher } from '../components/DynastySwitcher';
import { SeasonAtGlance } from '../components/SeasonAtGlance';
import { RecentActivity } from '../components/RecentActivity';
import { WeeklySnapshot } from '../components/WeeklySnapshot';
import { LogGameModal } from '../components/LogGameModal';
import { SeasonEndModal } from '../components/SeasonEndModal';
import { StatHighlights } from '../components/StatHighlights';
import { GameLog } from '../components/GameLog';
import type { GameResult } from '@dynasty-os/core-types';

const CHECKLIST_TASKS = [
  { id: 'log-games', label: 'Log all games for the season' },
  { id: 'season-end', label: 'Record season end data (bowl/playoff/ranking)' },
  { id: 'narrative', label: 'Generate season recap narrative' },
  { id: 'player-stats', label: 'Update player stats for the season' },
  { id: 'recruiting', label: 'Log recruiting class (CFB)', cfbOnly: true },
  { id: 'nfl-draft', label: 'Log NFL draft class (CFB)', cfbOnly: true },
  { id: 'transfer-portal', label: 'Log transfer portal activity (CFB)', cfbOnly: true },
] as const;

const CHECKLIST_KEY = (seasonId: string) => `dynasty-os-checklist-${seasonId}`;

const SPORT_BADGE: Record<string, { label: string; classes: string }> = {
  cfb: { label: 'CFB', classes: 'bg-orange-600 text-orange-100' },
  madden: { label: 'NFL', classes: 'bg-green-700 text-green-100' },
  nfl2k: { label: 'NFL 2K', classes: 'bg-purple-700 text-purple-100' },
};

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
    >
      {label}
    </button>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-2">
        {title}
      </div>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { seasons, activeSeason, loading: seasonLoading } = useSeasonStore();
  const { games, loading: gameLoading } = useGameStore();

  const [logGameOpen, setLogGameOpen] = useState(false);
  const [seasonEndOpen, setSeasonEndOpen] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (!activeSeason) return {};
    try {
      const stored = localStorage.getItem(CHECKLIST_KEY(activeSeason.id));
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!activeDynasty) return;
    useSeasonStore.getState().loadSeasons(activeDynasty.id);
  }, [activeDynasty?.id]);

  useEffect(() => {
    if (!activeSeason) return;
    useGameStore.getState().loadGames(activeSeason.id);
  }, [activeSeason?.id]);

  useEffect(() => {
    if (!activeSeason) return;
    try {
      const stored = localStorage.getItem(CHECKLIST_KEY(activeSeason.id));
      setChecklist(stored ? (JSON.parse(stored) as Record<string, boolean>) : {});
    } catch {
      setChecklist({});
    }
  }, [activeSeason?.id]);

  const toggleTask = (taskId: string) => {
    if (!activeSeason) return;
    setChecklist((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      localStorage.setItem(CHECKLIST_KEY(activeSeason.id), JSON.stringify(next));
      return next;
    });
  };

  if (!activeDynasty) return null;

  const badge = SPORT_BADGE[activeDynasty.sport] ?? {
    label: activeDynasty.sport.toUpperCase(),
    classes: 'bg-gray-600 text-gray-100',
  };

  const handleCreateFirstSeason = async () => {
    await useSeasonStore.getState().createSeason(activeDynasty.id, activeDynasty.currentYear);
  };

  const recentGames = [...games].sort((a, b) => b.week - a.week).slice(0, 5);

  const handleGameUpdate = async (
    id: string,
    updates: { teamScore?: number; opponentScore?: number; result?: GameResult; notes?: string }
  ) => {
    await useGameStore.getState().updateGame(id, updates);
    if (activeDynasty) await useSeasonStore.getState().loadSeasons(activeDynasty.id);
    if (activeSeason) await useGameStore.getState().loadGames(activeSeason.id);
  };

  const nav = useNavigationStore.getState();

  return (
    <div className="flex h-[calc(100vh-40px)] bg-gray-900 text-white overflow-hidden">
      {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
        {/* Dynasty identity */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-sm font-bold truncate leading-tight">{activeDynasty.name}</h1>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${badge.classes}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {activeDynasty.teamName} &middot; {activeDynasty.currentYear}
          </div>
        </div>

        {/* Primary CTAs */}
        <div className="px-3 py-3 border-b border-gray-800 flex flex-col gap-2">
          <button
            onClick={() => setLogGameOpen(true)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Log Game
          </button>
          <button
            onClick={() => setSeasonEndOpen(true)}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            End Season
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">
          {activeSeason && (
            <NavSection title="Season">
              <NavLink label="Season Recap" onClick={() => nav.goToSeasonRecap(activeSeason.id)} />
            </NavSection>
          )}

          <NavSection title="Program">
            <NavLink label="Trophy Room" onClick={() => nav.goToTrophyRoom()} />
            <NavLink label="Coaching Resume" onClick={() => nav.goToCoachingResume()} />
            <NavLink label="Scouting Cards" onClick={() => nav.goToScoutingCard()} />
          </NavSection>

          <NavSection title="Roster">
            <NavLink label="Manage Roster" onClick={() => nav.goToRoster()} />
            <NavLink label="Program Legends" onClick={() => nav.goToLegends()} />
            <NavLink label="Records & Leaderboards" onClick={() => nav.goToRecords()} />
          </NavSection>

          {activeDynasty.sport === 'cfb' && (
            <NavSection title="CFB Program">
              <NavLink label="Recruiting" onClick={() => nav.goToRecruiting()} />
              <NavLink label="Transfer Portal" onClick={() => nav.goToTransferPortal()} />
              <NavLink label="NFL Draft Tracker" onClick={() => nav.goToDraftTracker()} />
              <NavLink label="Program Prestige" onClick={() => nav.goToPrestigeTracker()} />
              <NavLink label="Rivalry Tracker" onClick={() => nav.goToRivalryTracker()} />
              <NavLink label="Program Timeline" onClick={() => nav.goToProgramTimeline()} />
              <NavLink label="Parse Screenshot" onClick={() => nav.goToScreenshotIngestion()} />
            </NavSection>
          )}

          {(activeDynasty.sport === 'madden' || activeDynasty.sport === 'nfl2k') && (
            <NavSection title="NFL Franchise">
              {activeDynasty.sport === 'madden' && (
                <NavLink label="Sync Franchise Save" onClick={() => nav.goToMaddenSync()} />
              )}
              <NavLink label="Parse Screenshot" onClick={() => nav.goToScreenshotIngestion()} />
              <NavLink label="Community Rosters" onClick={() => nav.goToRosterHub()} />
            </NavSection>
          )}
        </nav>

        {/* Dynasty switcher at bottom */}
        <div className="px-3 py-3 border-t border-gray-800">
          <DynastySwitcher />
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Dynasty info strip */}
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-800/30 px-6 py-2 flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Coach </span>
            <span className="text-gray-200">{activeDynasty.coachName}</span>
          </div>
          <div>
            <span className="text-gray-500">Game </span>
            <span className="text-gray-200">{activeDynasty.gameVersion}</span>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6">
          {/* Loading skeleton */}
          {seasonLoading && !activeSeason && (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-5 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-700 rounded" />
                    <div className="h-3 bg-gray-700 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No seasons yet */}
          {!seasonLoading && seasons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-gray-300 font-semibold text-lg mb-2">Start Your First Season</h2>
              <p className="text-gray-500 text-sm max-w-sm mb-6">
                Track your {activeDynasty.currentYear} season — record every game, watch your ranking
                move, and build your dynasty story.
              </p>
              <button
                onClick={handleCreateFirstSeason}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Start {activeDynasty.currentYear} Season
              </button>
            </div>
          )}

          {/* Active season dashboard */}
          {activeSeason && (
            <>
              {/* Stats row: left 2/3 + right 1/3 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 flex flex-col gap-4">
                  <SeasonAtGlance season={activeSeason} />
                  <RecentActivity games={recentGames} />
                </div>
                <div className="flex flex-col gap-4">
                  <WeeklySnapshot season={activeSeason} games={games} />
                  <StatHighlights games={games} />
                  {/* Season Checklist widget */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Season Checklist
                    </h3>
                    <ul className="space-y-2">
                      {CHECKLIST_TASKS.filter(
                        (task) => !('cfbOnly' in task) || activeDynasty.sport === 'cfb'
                      ).map((task) => (
                        <li key={task.id}>
                          <label className="flex items-start gap-2.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={!!checklist[task.id]}
                              onChange={() => toggleTask(task.id)}
                              className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
                            />
                            <span
                              className={`text-sm transition-colors ${
                                checklist[task.id]
                                  ? 'text-gray-500 line-through'
                                  : 'text-gray-300 group-hover:text-white'
                              }`}
                            >
                              {task.label}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const applicable = CHECKLIST_TASKS.filter(
                        (t) => !('cfbOnly' in t) || activeDynasty.sport === 'cfb'
                      );
                      const done = applicable.filter((t) => checklist[t.id]).length;
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                          {done}/{applicable.length} complete
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Game log — full width, always visible */}
              <GameLog games={games} onUpdateGame={handleGameUpdate} />
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {activeSeason && (
        <>
          <LogGameModal
            isOpen={logGameOpen}
            onClose={async () => {
              setLogGameOpen(false);
              if (activeDynasty && activeSeason) {
                await useSeasonStore.getState().loadSeasons(activeDynasty.id);
                await useGameStore.getState().loadGames(activeSeason.id);
              }
            }}
            dynastyId={activeDynasty.id}
            seasonId={activeSeason.id}
            sport={activeDynasty.sport}
          />
          <SeasonEndModal
            isOpen={seasonEndOpen}
            onClose={async () => {
              setSeasonEndOpen(false);
              if (activeDynasty) {
                await useSeasonStore.getState().loadSeasons(activeDynasty.id);
              }
            }}
            seasonId={activeSeason.id}
            dynastyId={activeDynasty.id}
            currentSeason={activeSeason}
          />
        </>
      )}
    </div>
  );
}
