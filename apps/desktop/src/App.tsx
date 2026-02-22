import React from 'react';
import { useDynastyStore } from './store';
import { useNavigationStore } from './store/navigation-store';
import { LauncherPage } from './pages/LauncherPage';
import { DashboardPage } from './pages/DashboardPage';
import { RosterPage } from './pages/RosterPage';
import { PlayerProfilePage } from './pages/PlayerProfilePage';
import { LegendsPage } from './pages/LegendsPage';

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
    default:
      return <DashboardPage />;
  }
}

export default App;
