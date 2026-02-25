import React, { useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { useNavigationStore } from '../store/navigation-store';
import { useDynastyStore } from '../store';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const nav = useNavigationStore.getState();
  const activeDynasty = useDynastyStore.getState().activeDynasty;
  const inputRef = useRef<HTMLInputElement>(null);

  // Tauri WebView focus fix: imperatively focus input after dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const select = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      {/* Palette card */}
      <div className="relative z-10 w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        <Command className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-gray-700">
          <Command.Input
            ref={inputRef}
            placeholder="Type a command or search..."
            className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 outline-none text-sm"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {/* Navigate group */}
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              <PaletteItem value="nav-dashboard" onSelect={() => select(() => nav.goToDashboard())}>Dashboard</PaletteItem>
              <PaletteItem value="nav-roster" onSelect={() => select(() => nav.goToRoster())}>Roster</PaletteItem>
              <PaletteItem value="nav-legends" onSelect={() => select(() => nav.goToLegends())}>Program Legends</PaletteItem>
              <PaletteItem value="nav-records" onSelect={() => select(() => nav.goToRecords())}>Records &amp; Leaderboards</PaletteItem>
              <PaletteItem value="nav-trophy-room" onSelect={() => select(() => nav.goToTrophyRoom())}>Trophy Room</PaletteItem>
              <PaletteItem value="nav-coaching-resume" onSelect={() => select(() => nav.goToCoachingResume())}>Coaching Resume</PaletteItem>
              <PaletteItem value="nav-scouting-card" onSelect={() => select(() => nav.goToScoutingCard())}>Scouting Cards</PaletteItem>
              <PaletteItem value="nav-screenshot-ingestion" onSelect={() => select(() => nav.goToScreenshotIngestion())}>Parse Screenshot</PaletteItem>
              {activeDynasty?.sport === 'madden' && (
                <PaletteItem value="nav-madden-sync" onSelect={() => select(() => nav.goToMaddenSync())}>Sync Franchise Save</PaletteItem>
              )}
              {(activeDynasty?.sport === 'madden' || activeDynasty?.sport === 'nfl2k') && (
                <PaletteItem value="nav-roster-hub" onSelect={() => select(() => nav.goToRosterHub())}>Community Rosters</PaletteItem>
              )}
            </Command.Group>

            {/* CFB group — only for cfb dynasties */}
            {activeDynasty?.sport === 'cfb' && (
              <Command.Group
                heading="CFB Program"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              >
                <PaletteItem value="nav-recruiting" onSelect={() => select(() => nav.goToRecruiting())}>Recruiting</PaletteItem>
                <PaletteItem value="nav-transfer-portal" onSelect={() => select(() => nav.goToTransferPortal())}>Transfer Portal</PaletteItem>
                <PaletteItem value="nav-draft-tracker" onSelect={() => select(() => nav.goToDraftTracker())}>NFL Draft Tracker</PaletteItem>
                <PaletteItem value="nav-prestige-tracker" onSelect={() => select(() => nav.goToPrestigeTracker())}>Program Prestige</PaletteItem>
                <PaletteItem value="nav-rivalry-tracker" onSelect={() => select(() => nav.goToRivalryTracker())}>Rivalry Tracker</PaletteItem>
                <PaletteItem value="nav-program-timeline" onSelect={() => select(() => nav.goToProgramTimeline())}>Program Timeline</PaletteItem>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </Command.Dialog>
  );
}

// Reusable styled item to keep JSX DRY
function PaletteItem({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 cursor-pointer data-[selected=true]:bg-gray-700 data-[selected=true]:text-white transition-colors"
    >
      {children}
    </Command.Item>
  );
}
