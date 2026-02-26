import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Tooltip } from '../components/Tooltip';
import { QuickEntryHub } from '../components/QuickEntryHub';
import { SetupWizard } from '../components/SetupWizard';
import { CHECKLIST_TASKS, verifyAllTasks } from '../lib/checklist-service';
import { isAutoExportEnabled, setAutoExportEnabled } from '../lib/auto-export-service';
import { getTeamLogoUrl } from '../lib/team-logo-service';
import type { GameResult } from '@dynasty-os/core-types';

const CHECKLIST_KEY = (seasonId: string) => `dynasty-os-checklist-${seasonId}`;

const SPORT_BADGE: Record<string, { label: string; classes: string }> = {
  cfb: { label: 'CFB', classes: 'bg-orange-600 text-orange-100' },
  madden: { label: 'NFL', classes: 'bg-green-700 text-green-100' },
  nfl2k: { label: 'NFL 2K', classes: 'bg-purple-700 text-purple-100' },
};

function NavLink({ label, onClick, tooltip }: { label: string; onClick: () => void; tooltip?: string }) {
  const btn = (
    <button
      onClick={onClick}
      className="w-full text-left px-2 py-1.5 text-sm text-gray-100 hover:text-white hover:bg-gray-800 rounded transition-colors"
    >
      {label}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip content={tooltip} side="right">
      {btn}
    </Tooltip>
  );
}

function NavSection({ title, children, tourId }: { title: string; children: React.ReactNode; tourId?: string }) {
  return (
    <div data-tour-id={tourId}>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2">
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
  const [autoExport, setAutoExport] = useState(() =>
    activeDynasty ? isAutoExportEnabled(activeDynasty.id) : false
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (!activeSeason) return {};
    try {
      const stored = localStorage.getItem(CHECKLIST_KEY(activeSeason.id));
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [verified, setVerified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeDynasty) return;
    useSeasonStore.getState().loadSeasons(activeDynasty.id);
    setAutoExport(isAutoExportEnabled(activeDynasty.id));
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

  useEffect(() => {
    if (!activeDynasty || !activeSeason) return;
    const applicableTasks = CHECKLIST_TASKS.filter(
      (t) => !t.cfbOnly || activeDynasty.sport === 'cfb'
    );
    verifyAllTasks(activeDynasty.id, activeSeason.id, applicableTasks).then(setVerified);
  }, [activeDynasty?.id, activeSeason?.id, games.length, activeSeason?.updatedAt]);

  const toggleTask = (taskId: string) => {
    if (!activeSeason) return;
    const isChecking = !checklist[taskId];
    if (isChecking && !verified[taskId]) {
      toast('Step not detected in data', {
        description: 'Mark done anyway if you completed it outside the app.',
        duration: 4000,
      });
    }
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

  const handleNewSeason = async () => {
    const suggestedYear = activeSeason ? activeSeason.year + 1 : activeDynasty.currentYear;
    await useSeasonStore.getState().createSeason(activeDynasty.id, suggestedYear);
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
      <aside data-tour-id="tour-sidebar" className="w-56 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900 overflow-visible">
        {/* Dynasty identity */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const logoUrl = getTeamLogoUrl(activeDynasty.teamName, activeDynasty.sport);
              return logoUrl ? (
                <div className="w-8 h-8 rounded-md bg-white flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                  <img
                    src={logoUrl}
                    alt={activeDynasty.teamName}
                    width={28}
                    height={28}
                    className="object-contain w-full h-full"
                    onError={(e) => { const p = e.currentTarget.parentElement; if (p) p.style.display = 'none'; }}
                  />
                </div>
              ) : null;
            })()}
            <h1 className="text-sm font-bold truncate leading-tight flex-1">{activeDynasty.name}</h1>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${badge.classes}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {activeDynasty.teamName} &middot; {activeDynasty.currentYear}
          </div>
        </div>

        {/* Primary CTAs */}
        <div className="px-3 py-3 border-b border-gray-800 flex flex-col gap-2">
          <button
            data-tour-id="tour-log-game"
            onClick={() => setLogGameOpen(true)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Log Game
          </button>
          <button
            data-tour-id="tour-end-season"
            onClick={() => setSeasonEndOpen(true)}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            End Season
          </button>
          {activeSeason && (
            <button
              onClick={handleNewSeason}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + New Season
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4" style={{ overflowX: 'visible' }}>
          {activeSeason && (
            <NavSection title="Season">
              <NavLink label="Season Recap" onClick={() => nav.goToSeasonRecap(activeSeason.id)} />
            </NavSection>
          )}

          <NavSection title="Program" tourId="tour-program">
            <NavLink label="Trophy Room" onClick={() => nav.goToTrophyRoom()} tooltip="View trophies and championship history from your dynasty" />
            <NavLink label="Coaching Resume" onClick={() => nav.goToCoachingResume()} tooltip="Your career record, accolades, and coaching history" />
            <NavLink label="Scouting Cards" onClick={() => nav.goToScoutingCard()} tooltip="Printable-style cards summarizing opponent tendencies" />
          </NavSection>

          <NavSection title="Roster" tourId="tour-roster">
            <NavLink label="Manage Roster" onClick={() => nav.goToRoster()} tooltip="View and manage your active players and their career stats" />
            <NavLink label="Program Legends" onClick={() => nav.goToLegends()} tooltip="Hall of fame view of all-time great players from your dynasty" />
            <NavLink label="Records & Leaderboards" onClick={() => nav.goToRecords()} tooltip="Single-season and career statistical leaders" />
          </NavSection>

          {activeDynasty.sport === 'cfb' && (
            <NavSection title="CFB Program" tourId="tour-sport-section">
              <NavLink label="Recruiting" onClick={() => nav.goToRecruiting()} tooltip="Track your recruiting classes, star ratings, and class rank" />
              <NavLink label="Transfer Portal" onClick={() => nav.goToTransferPortal()} tooltip="Track incoming and outgoing players via the portal" />
              <NavLink label="NFL Draft Tracker" onClick={() => nav.goToDraftTracker()} tooltip="Record which players were drafted and their round/team" />
              <NavLink label="Program Prestige" onClick={() => nav.goToPrestigeTracker()} tooltip="Track your program's prestige rating over time" />
              <NavLink label="Rivalry Tracker" onClick={() => nav.goToRivalryTracker()} tooltip="Track series records, momentum, and key moments vs. rivals" />
              <NavLink label="Program Timeline" onClick={() => nav.goToProgramTimeline()} tooltip="Visual timeline of your dynasty's biggest moments" />
              <NavLink label="Parse Screenshot" onClick={() => nav.goToScreenshotIngestion()} tooltip="Use AI to extract stats from in-game screenshots" />
            </NavSection>
          )}

          {(activeDynasty.sport === 'madden' || activeDynasty.sport === 'nfl2k') && (
            <NavSection title="NFL Franchise" tourId="tour-sport-section">
              {activeDynasty.sport === 'madden' && (
                <NavLink label="Sync Franchise Save" onClick={() => nav.goToMaddenSync()} tooltip="Import your Madden franchise data automatically" />
              )}
              <NavLink label="Parse Screenshot" onClick={() => nav.goToScreenshotIngestion()} tooltip="Use AI to extract stats from in-game screenshots" />
            </NavSection>
          )}
        </nav>

        {/* Auto-export toggle */}
        <div className="px-3 py-2 border-t border-gray-800">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={autoExport}
              onChange={(e) => {
                if (!activeDynasty) return;
                setAutoExportEnabled(activeDynasty.id, e.target.checked);
                setAutoExport(e.target.checked);
              }}
              className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
            />
            <span className="text-xs text-gray-300 group-hover:text-gray-200 transition-colors leading-tight">
              Auto-export on save
            </span>
          </label>
        </div>

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
            <span className="text-gray-400">Coach </span>
            <span className="text-gray-100">{activeDynasty.coachName}</span>
          </div>
          <div>
            <span className="text-gray-400">Game </span>
            <span className="text-gray-100">{activeDynasty.gameVersion}</span>
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
              {/* Setup Wizard — shown until dismissed */}
              <SetupWizard
                dynastyId={activeDynasty.id}
                sport={activeDynasty.sport}
                onLogGame={() => setLogGameOpen(true)}
              />

              {/* Quick Entry Hub */}
              <QuickEntryHub
                onLogGame={() => setLogGameOpen(true)}
                onEndSeason={() => setSeasonEndOpen(true)}
              />

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
                  <div data-tour-id="tour-checklist" className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Season Checklist
                    </h3>
                    <ul className="space-y-2">
                      {CHECKLIST_TASKS.filter(
                        (task) => !task.cfbOnly || activeDynasty.sport === 'cfb'
                      ).map((task) => {
                        const isChecked = !!checklist[task.id];
                        const isVerified = !!verified[task.id];
                        const isConfirmedComplete = isVerified && isChecked;
                        return (
                          <li key={task.id} className="group flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTask(task.id)}
                              className={`mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer flex-shrink-0 focus:ring-offset-gray-900 ${
                                isConfirmedComplete
                                  ? 'text-green-500 focus:ring-green-500'
                                  : 'text-blue-500 focus:ring-blue-500'
                              }`}
                            />
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {isVerified && !isChecked && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Data ready" />
                              )}
                              <Tooltip content={task.description} side="top">
                                <span
                                  className={`text-sm transition-colors cursor-default ${
                                    isConfirmedComplete
                                      ? 'text-green-600 line-through'
                                      : isChecked
                                      ? 'text-gray-500 line-through'
                                      : isVerified
                                      ? 'text-gray-100 group-hover:text-white'
                                      : 'text-gray-200 group-hover:text-white'
                                  }`}
                                >
                                  {task.label}
                                </span>
                              </Tooltip>
                            </div>
                            {task.navigateTo !== 'dashboard' && (
                              <button
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onClick={() => nav.navigate(task.navigateTo as any)}
                                className="opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0 p-0.5 text-gray-500 hover:text-gray-200 transition-all"
                                title={`Go to ${task.label}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {(() => {
                      const applicable = CHECKLIST_TASKS.filter(
                        (t) => !t.cfbOnly || activeDynasty.sport === 'cfb'
                      );
                      const done = applicable.filter((t) => checklist[t.id]).length;
                      const verifiedCount = applicable.filter((t) => verified[t.id]).length;
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
                          <span>{done}/{applicable.length} complete</span>
                          {verifiedCount > 0 && (
                            <span className="text-green-600">{verifiedCount} verified</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Game log — full width, always visible */}
              <GameLog
                games={games}
                dynasty={activeDynasty}
                season={activeSeason}
                activeTone="espn"
                onUpdateGame={handleGameUpdate}
              />
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