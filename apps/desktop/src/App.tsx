import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { useDynastyStore } from './store';
import { useNavigationStore } from './store/navigation-store';
import { TourOverlay } from './components/TourOverlay';
import { LauncherPage } from './pages/LauncherPage';
import { DashboardPage } from './pages/DashboardPage';
import { RosterPage } from './pages/RosterPage';
import { PlayerProfilePage } from './pages/PlayerProfilePage';
import { LegendsPage } from './pages/LegendsPage';
import { RecordsPage } from './pages/RecordsPage';
import { SeasonRecapPage } from './pages/SeasonRecapPage';
import { RecruitingPage } from './pages/RecruitingPage';
import { TransferPortalPage } from './pages/TransferPortalPage';
import { DraftTrackerPage } from './pages/DraftTrackerPage';
import { PrestigeTrackerPage } from './pages/PrestigeTrackerPage';
import { RivalryTrackerPage } from './pages/RivalryTrackerPage';
import { ProgramTimelinePage } from './pages/ProgramTimelinePage';
import { ScoutingCardPage } from './pages/ScoutingCardPage';
import { TrophyRoomPage } from './pages/TrophyRoomPage';
import { CoachingResumePage } from './pages/CoachingResumePage';
import { ScreenshotIngestionPage } from './pages/ScreenshotIngestionPage';
import { MaddenSyncPage } from './pages/MaddenSyncPage';
import { CoachingStaffPage } from './pages/CoachingStaffPage';
import { NilLedgerPage } from './pages/NilLedgerPage';
import { FutureSchedulePage } from './pages/FutureSchedulePage';
import { PlayoffSimulatorPage } from './pages/PlayoffSimulatorPage';
import { TradeCalculatorPage } from './pages/TradeCalculatorPage';
import { RecruitingComparisonPage } from './pages/RecruitingComparisonPage';
import { RecordBookPage } from './pages/RecordBookPage';
import { TickerBar } from './components/TickerBar';
import { CommandPalette } from './components/CommandPalette';

function PageContent() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const currentPage = useNavigationStore((s) => s.currentPage);

  if (!activeDynasty) return <LauncherPage />;

  switch (currentPage) {
    case 'roster':
      return <RosterPage />;
    case 'player-profile':
      return <PlayerProfilePage />;
    case 'legends':
      return <LegendsPage />;
    case 'records':
      return <RecordsPage />;
    case 'season-recap':
      return <SeasonRecapPage />;
    case 'recruiting':
      return <RecruitingPage />;
    case 'transfer-portal':
      return <TransferPortalPage />;
    case 'draft-tracker':
      return <DraftTrackerPage />;
    case 'prestige-tracker':
      return <PrestigeTrackerPage />;
    case 'rivalry-tracker':
      return <RivalryTrackerPage />;
    case 'program-timeline':
      return <ProgramTimelinePage />;
    case 'scouting-card':
      return <ScoutingCardPage />;
    case 'trophy-room':
      return <TrophyRoomPage />;
    case 'coaching-resume':
      return <CoachingResumePage />;
    case 'screenshot-ingestion':
      return <ScreenshotIngestionPage />;
    case 'madden-sync':
      return <MaddenSyncPage />;
    case 'coaching-staff':
      return <CoachingStaffPage />;
    case 'nil-ledger':
      return <NilLedgerPage />;
    case 'future-schedule':
      return <FutureSchedulePage />;
    case 'playoff-simulator':
      return <PlayoffSimulatorPage />;
    case 'trade-calculator':
      return <TradeCalculatorPage />;
    case 'recruiting-comparison':
      return <RecruitingComparisonPage />;
    case 'record-book':
      return <RecordBookPage />;
    default:
      return <DashboardPage />;
  }
}

function App() {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);

  useEffect(() => {
    // Tauri WebView cold-launch fix: force focus into document body
    // so keydown listeners receive events on first launch without clicking
    // (STATE.md decision: "Ctrl+K autofocus fix")
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
      hiddenInputRef.current.blur();
    }

    // Cmd+K / Ctrl+K listener — opens command palette (Phase 11 QOL-04)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-open tour for newly created dynasties
  useEffect(() => {
    if (!activeDynasty) return;
    // Check if this is a fresh dynasty creation by looking for the pending flag
    const pendingKey = 'dynasty-os-onboarding-pending';
    if (localStorage.getItem(pendingKey) === 'true') {
      localStorage.removeItem(pendingKey);
      setOnboardingOpen(true);
    }
  }, [activeDynasty?.id]);

  return (
    <div className="pb-10">
      {/* Hidden input forces keyboard focus into document on Tauri cold launch */}
      <input
        ref={hiddenInputRef}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        tabIndex={-1}
        readOnly
        aria-hidden="true"
      />
      {/* Help / tour re-open button — only shown when a dynasty is active */}
      {activeDynasty && (
        <button
          onClick={() => setOnboardingOpen(true)}
          className="fixed top-1 right-2 z-40 w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs font-bold transition-colors border border-gray-700"
          title="Open tour / help"
        >
          ?
        </button>
      )}
      <PageContent />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <TourOverlay isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      <TickerBar />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default App;
