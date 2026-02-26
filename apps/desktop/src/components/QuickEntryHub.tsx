import React, { useEffect } from 'react';
import { useDynastyStore } from '../store';
import { useGameStore } from '../store/game-store';
import { usePlayerStore } from '../store/player-store';
import { useRecruitingStore } from '../store/recruiting-store';
import { useCoachingStaffStore } from '../store/coaching-staff-store';
import { useNilStore } from '../store/nil-store';
import { useNavigationStore } from '../store/navigation-store';

export const AUTO_OPEN_ADD_PLAYER_KEY = 'dynasty-os-auto-open-add-player';

interface QuickEntryHubProps {
  onLogGame: () => void;
  onEndSeason: () => void;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-green-500' : 'bg-gray-600'}`}
      title={active ? 'Has data' : 'No data yet'}
    />
  );
}

function ActionPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors border border-gray-600/50 whitespace-nowrap"
    >
      {label}
    </button>
  );
}

function Category({
  icon,
  title,
  hasData,
  children,
}: {
  icon: string;
  title: string;
  hasData?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1 truncate">
          {title}
        </span>
        {hasData !== undefined && <StatusDot active={hasData} />}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function QuickEntryHub({ onLogGame, onEndSeason }: QuickEntryHubProps) {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const games = useGameStore((s) => s.games);
  const players = usePlayerStore((s) => s.players);
  const classes = useRecruitingStore((s) => s.classes);
  const staff = useCoachingStaffStore((s) => s.staff);
  const nilEntries = useNilStore((s) => s.entries);

  useEffect(() => {
    if (!activeDynasty) return;
    usePlayerStore.getState().loadPlayers(activeDynasty.id);
    useCoachingStaffStore.getState().loadStaff(activeDynasty.id);
    if (activeDynasty.sport === 'cfb') {
      useRecruitingStore.getState().loadClasses(activeDynasty.id);
      useNilStore.getState().loadEntries(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  if (!activeDynasty) return null;

  const isCfb = activeDynasty.sport === 'cfb';
  const isMadden = activeDynasty.sport === 'madden';

  const hasGames = games.length > 0;
  const hasPlayers = players.length > 0;
  const hasRecruiting = classes.length > 0;
  const hasCoaches = staff.some((c) => c.fireYear == null);
  const hasNil = nilEntries.length > 0;

  const nav = useNavigationStore.getState();

  const handleAddPlayer = () => {
    localStorage.setItem(AUTO_OPEN_ADD_PLAYER_KEY, 'true');
    nav.goToRoster();
  };

  return (
    <div data-tour-id="tour-quick-entry" className="bg-gray-800/30 border border-gray-700/60 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Quick Entry
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <Category icon="🏈" title="This Season" hasData={hasGames}>
          <ActionPill label="Log Game" onClick={onLogGame} />
          <ActionPill label="End Season" onClick={onEndSeason} />
        </Category>

        <Category icon="👥" title="Roster" hasData={hasPlayers}>
          <ActionPill label="Add Player" onClick={handleAddPlayer} />
          <ActionPill label="Log Stats" onClick={() => nav.goToRoster()} />
        </Category>

        {isCfb && (
          <Category icon="📋" title="Program" hasData={hasRecruiting}>
            <ActionPill label="Recruiting" onClick={() => nav.goToRecruiting()} />
            <ActionPill label="Transfer Portal" onClick={() => nav.goToTransferPortal()} />
            <ActionPill label="Draft Pick" onClick={() => nav.goToDraftTracker()} />
          </Category>
        )}

        <Category
          icon="💼"
          title="Staff & Finances"
          hasData={isCfb ? hasCoaches || hasNil : hasCoaches}
        >
          <ActionPill label="Add Coach" onClick={() => nav.goToCoachingStaff()} />
          {isCfb && <ActionPill label="NIL Deal" onClick={() => nav.goToNilLedger()} />}
        </Category>

        <Category icon="📅" title="Planning">
          <ActionPill label="Future Game" onClick={() => nav.goToFutureSchedule()} />
          {isCfb && <ActionPill label="Add Rival" onClick={() => nav.goToRivalryTracker()} />}
          <ActionPill label="Scouting Note" onClick={() => nav.goToScoutingCard()} />
        </Category>

        <Category icon="📸" title="Import">
          <ActionPill label="Screenshot" onClick={() => nav.goToScreenshotIngestion()} />
          {isMadden && (
            <ActionPill label="Sync Franchise" onClick={() => nav.goToMaddenSync()} />
          )}
        </Category>
      </div>
    </div>
  );
}
