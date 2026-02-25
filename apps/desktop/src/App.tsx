import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { useDynastyStore } from './store';
import { useNavigationStore } from './store/navigation-store';
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
import { RosterHubPage } from './pages/RosterHubPage';
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
    case 'roster-hub':
      return <RosterHubPage />;
    default:
      return <DashboardPage />;
  }
}

function App() {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
      <PageContent />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <TickerBar />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default App;
