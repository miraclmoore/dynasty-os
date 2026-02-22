import React from 'react';
import { useDynastyStore } from './store';
import { useNavigationStore } from './store/navigation-store';
import { LauncherPage } from './pages/LauncherPage';
import { DashboardPage } from './pages/DashboardPage';
import { RosterPage } from './pages/RosterPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-gray-300">{title}</h1>
      <p className="text-gray-500 text-sm">Coming soon</p>
      <button
        onClick={() => useNavigationStore.getState().goToDashboard()}
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function App() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const currentPage = useNavigationStore((s) => s.currentPage);

  if (!activeDynasty) return <LauncherPage />;

  switch (currentPage) {
    case 'roster':
      return <RosterPage />;
    case 'player-profile':
      return <PlaceholderPage title="Player Profile" />;
    case 'legends':
      return <PlaceholderPage title="Legends" />;
    default:
      return <DashboardPage />;
  }
}

export default App;
