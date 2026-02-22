import React from 'react';
import { useDynastyStore } from './store';
import { LauncherPage } from './pages/LauncherPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);

  return activeDynasty ? <DashboardPage /> : <LauncherPage />;
}

export default App;
