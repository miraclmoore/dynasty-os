import React from 'react';
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

function App() {
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
    default:
      return <DashboardPage />;
  }
}

export default App;
