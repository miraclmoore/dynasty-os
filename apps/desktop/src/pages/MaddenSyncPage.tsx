import React, { useState, useEffect, useRef } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useNavigationStore } from '../store/navigation-store';
import {
  pickSaveFile,
  validateSaveFile,
  extractSaveData,
  computeSyncDiff,
  commitSyncDiff,
  getStoredSavePath,
  storeSavePath,
  clearSavePath,
  isWatcherEnabled,
  setWatcherEnabled,
  type ValidateResult,
  type ExtractResult,
  type SyncDiff,
} from '../lib/madden-sync-service';
import { startWatching, stopWatching } from '../lib/madden-watcher';

// ── Types ─────────────────────────────────────────────────────────────────────

type SyncState =
  | 'idle'
  | 'validating'
  | 'unsupported'
  | 'validated'
  | 'extracting'
  | 'confirming'
  | 'saving'
  | 'done';

const AUTO_CONFIRM_SECONDS = 10;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ supported }: { supported: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded ${
        supported ? 'bg-green-900 text-green-300' : 'bg-amber-900 text-amber-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${supported ? 'bg-green-400' : 'bg-amber-400'}`} />
      {supported ? 'Supported' : 'Unsupported'}
    </span>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  );
}

function DiffRow({ label, count, skipped }: { label: string; count: number; skipped: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-300 text-sm">{label}</span>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-green-400 font-semibold">+{count} new</span>
        {skipped > 0 && (
          <span className="text-gray-500">{skipped} skipped</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MaddenSyncPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason } = useSeasonStore();
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [savePath, setSavePath] = useState<string | null>(getStoredSavePath);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [extracted, setExtracted] = useState<ExtractResult | null>(null);
  const [diff, setDiff] = useState<SyncDiff | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_CONFIRM_SECONDS);
  const [watcherOn, setWatcherOn] = useState(isWatcherEnabled);
  const [watcherPrompt, setWatcherPrompt] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    gamesAdded: number;
    playersAdded: number;
    draftPicksAdded: number;
  } | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load seasons on mount
  useEffect(() => {
    if (activeDynasty) {
      useSeasonStore.getState().loadSeasons(activeDynasty.id);
    }
  }, [activeDynasty?.id]);

  // Start/stop background file watcher based on toggle + save path
  useEffect(() => {
    if (watcherOn && savePath) {
      startWatching(savePath, () => {
        // Show prompt banner when save file changes
        setWatcherPrompt(true);
      });
    } else {
      stopWatching();
    }
    return () => {
      stopWatching();
    };
  }, [watcherOn, savePath]);

  // Auto-confirm countdown
  useEffect(() => {
    if (syncState !== 'confirming') return;
    setCountdown(AUTO_CONFIRM_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          handleConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [syncState]);

  if (!activeDynasty) return null;

  const isMadden = activeDynasty.sport === 'madden';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    const path = await pickSaveFile();
    if (!path) return;
    setSavePath(path);
    storeSavePath(path);
    setValidation(null);
    setExtracted(null);
    setDiff(null);
    setErrorMsg(null);
    setSyncState('idle');
  };

  const handleValidate = async () => {
    if (!savePath) return;
    setSyncState('validating');
    setErrorMsg(null);
    const result = await validateSaveFile(savePath);
    setValidation(result);
    if (result.error) {
      setErrorMsg(result.message ?? 'Unknown error');
      setSyncState('idle');
      return;
    }
    if (!result.valid) {
      setErrorMsg(result.message ?? 'File is not a valid Madden franchise save.');
      setSyncState('idle');
      return;
    }
    if (!result.supported) {
      setSyncState('unsupported');
      return;
    }
    setSyncState('validated');
  };

  const handleExtract = async () => {
    if (!savePath || !activeSeason) return;
    setSyncState('extracting');
    setErrorMsg(null);
    const result = await extractSaveData(savePath);
    if (result.error) {
      setErrorMsg(result.message ?? 'Extraction failed.');
      setSyncState('validated');
      return;
    }
    setExtracted(result);
    const d = await computeSyncDiff(result, activeSeason.id, activeDynasty.id, activeDynasty.teamName);
    setDiff(d);
    setSyncState('confirming');
  };

  const handleConfirm = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!diff || !activeSeason) return;
    setSyncState('saving');
    const result = await commitSyncDiff(diff, activeSeason.id, activeDynasty.id, activeSeason.year);
    setCommitResult(result);
    // Reload seasons to reflect new game records
    await useSeasonStore.getState().loadSeasons(activeDynasty.id);
    setSyncState('done');
  };

  const handleCancel = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSyncState('validated');
  };

  const handleReset = () => {
    setValidation(null);
    setExtracted(null);
    setDiff(null);
    setErrorMsg(null);
    setCommitResult(null);
    setSyncState('idle');
  };

  const handleToggleWatcher = (enabled: boolean) => {
    setWatcherEnabled(enabled);
    setWatcherOn(enabled);
  };

  const handleClearSavePath = () => {
    clearSavePath();
    setSavePath(null);
    handleReset();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalNew = diff
    ? diff.gamesToAdd.length + diff.playersToAdd.length + diff.draftPicksToAdd.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToDashboard}
              className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              ← Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-lg font-bold">Madden Franchise Sync</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-800 text-green-200">
              BETA
            </span>
          </div>
        </div>
      </header>

      {/* File watcher modification prompt */}
      {watcherPrompt && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-900 border-t border-green-700 px-6 py-4 flex items-center justify-between z-50">
          <div>
            <p className="text-green-200 font-semibold text-sm">Save file updated</p>
            <p className="text-green-400/70 text-xs">Your Madden franchise save was modified. Ready to sync the latest changes?</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setWatcherPrompt(false)}
              className="px-3 py-1.5 text-green-400 hover:text-green-200 text-sm transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setWatcherPrompt(false);
                handleExtract();
              }}
              className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Sync Now
            </button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Sport guard */}
        {!isMadden && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-5">
            <p className="text-amber-300 text-sm font-semibold">
              Franchise Sync is only available for Madden dynasties.
            </p>
            <p className="text-amber-400/70 text-xs mt-1">
              Switch to a Madden dynasty to use this feature.
            </p>
          </div>
        )}

        {/* No active season */}
        {isMadden && !activeSeason && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <p className="text-gray-300 text-sm">
              No active season found. Start a season from the Dashboard first.
            </p>
          </div>
        )}

        {/* Main content */}
        {isMadden && activeSeason && (
          <>
            {/* ── Step 1: File picker ──────────────────────────────────────── */}
            <section className="bg-gray-800 rounded-lg p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Step 1 — Select Franchise Save File
              </h2>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePickFile}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white font-medium rounded-lg transition-colors"
                >
                  Browse…
                </button>
                {savePath ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs font-mono truncate">{savePath}</p>
                    <button
                      onClick={handleClearSavePath}
                      className="text-gray-600 hover:text-gray-400 text-xs mt-0.5 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm italic">No file selected</span>
                )}
              </div>

              <p className="text-gray-600 text-xs">
                Default location on Windows:{' '}
                <span className="font-mono">
                  C:\Users\[Name]\AppData\Local\Temp\Franchise\
                </span>
              </p>
            </section>

            {/* ── Step 2: Validate ────────────────────────────────────────── */}
            {savePath && syncState === 'idle' && (
              <section className="bg-gray-800 rounded-lg p-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Step 2 — Validate Save File
                </h2>
                <p className="text-gray-400 text-sm">
                  Check that the selected file is a valid Madden franchise save and confirm the game version is supported.
                </p>
                {errorMsg && (
                  <div className="bg-red-900/30 border border-red-700 rounded p-3">
                    <p className="text-red-300 text-sm">{errorMsg}</p>
                  </div>
                )}
                <button
                  onClick={handleValidate}
                  className="self-start px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Validate File
                </button>
              </section>
            )}

            {/* Validating spinner */}
            {syncState === 'validating' && <Spinner label="Validating save file…" />}

            {/* ── Unsupported version fallback ─────────────────────────── */}
            {syncState === 'unsupported' && validation && (
              <section className="bg-amber-900/20 border border-amber-700 rounded-lg p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-800 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-300">
                      Madden {validation.gameYear ?? validation.yearShort} — Not Yet Supported
                    </h3>
                    <StatusBadge supported={false} />
                  </div>
                </div>

                <p className="text-amber-200/80 text-sm leading-relaxed">
                  {validation.unsupportedReason}
                </p>

                <div className="bg-gray-900/50 rounded p-4 flex flex-col gap-2">
                  <p className="text-gray-300 text-sm font-semibold">Manual Entry Options</p>
                  <ul className="text-gray-400 text-sm list-disc list-inside space-y-1">
                    <li>
                      Use <strong>Log Game</strong> on the Dashboard to manually enter game results
                    </li>
                    <li>
                      Use <strong>Parse Screenshot</strong> to auto-fill from in-game screenshots
                    </li>
                    <li>
                      Check back for updates — Madden {validation.gameYear} support is in progress
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg transition-colors"
                  >
                    Try Another File
                  </button>
                  <button
                    onClick={goToDashboard}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-sm text-white font-semibold rounded-lg transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </section>
            )}

            {/* ── Validated — ready to sync ─────────────────────────────── */}
            {(syncState === 'validated' || syncState === 'extracting') && validation?.supported && (
              <section className="bg-gray-800 rounded-lg p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Step 3 — Sync Franchise Data
                  </h2>
                  <StatusBadge supported />
                </div>

                <div className="bg-gray-900 rounded p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-green-900 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-300 text-sm font-medium">
                      Madden {validation.gameYear} — Valid Franchise Save
                    </p>
                    <p className="text-gray-500 text-xs">
                      Season: {activeSeason.year} · Dynasty: {activeDynasty.name}
                    </p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm">
                  Extract game results, roster, and draft picks from this save file and sync them into Dynasty OS.
                </p>

                {errorMsg && (
                  <div className="bg-red-900/30 border border-red-700 rounded p-3">
                    <p className="text-red-300 text-sm">{errorMsg}</p>
                  </div>
                )}

                {syncState === 'extracting' ? (
                  <Spinner label="Extracting franchise data…" />
                ) : (
                  <button
                    onClick={handleExtract}
                    className="self-start px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Extract &amp; Preview Changes
                  </button>
                )}
              </section>
            )}

            {/* ── Confirming diff ───────────────────────────────────────── */}
            {syncState === 'confirming' && diff && (
              <section className="bg-gray-800 rounded-lg p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Confirm Changes
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-900 border-2 border-green-500 flex items-center justify-center">
                      <span className="text-green-300 text-xs font-bold tabular-nums">{countdown}</span>
                    </div>
                    <span className="text-gray-500 text-xs">Auto-confirm</span>
                  </div>
                </div>

                <p className="text-gray-400 text-sm">
                  The following changes will be committed to your <strong className="text-white">{activeSeason.year}</strong> season.
                </p>

                {/* Diff table */}
                <div className="bg-gray-900 rounded p-3">
                  <DiffRow
                    label="Game Results"
                    count={diff.gamesToAdd.length}
                    skipped={diff.gamesSkipped}
                  />
                  <DiffRow
                    label="Roster Players"
                    count={diff.playersToAdd.length}
                    skipped={diff.playersSkipped}
                  />
                  <DiffRow
                    label="Draft Picks"
                    count={diff.draftPicksToAdd.length}
                    skipped={diff.draftPicksSkipped}
                  />
                </div>

                {/* Game preview */}
                {diff.gamesToAdd.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Games to Add</p>
                    <div className="bg-gray-900 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left px-3 py-2 text-gray-500">Wk</th>
                            <th className="text-left px-3 py-2 text-gray-500">Opponent</th>
                            <th className="text-right px-3 py-2 text-gray-500">Score</th>
                            <th className="text-right px-3 py-2 text-gray-500">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diff.gamesToAdd.slice(0, 10).map((g, i) => (
                            <tr key={i} className="border-b border-gray-800 last:border-0">
                              <td className="px-3 py-1.5 text-gray-400">{g.week}</td>
                              <td className="px-3 py-1.5 text-gray-300">{g.opponent}</td>
                              <td className="px-3 py-1.5 text-right text-gray-300 font-mono">
                                {g.teamScore}–{g.opponentScore}
                              </td>
                              <td className={`px-3 py-1.5 text-right font-bold ${g.result === 'W' ? 'text-green-400' : g.result === 'L' ? 'text-red-400' : 'text-gray-400'}`}>
                                {g.result}
                              </td>
                            </tr>
                          ))}
                          {diff.gamesToAdd.length > 10 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-1.5 text-gray-600 text-center">
                                +{diff.gamesToAdd.length - 10} more games
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {totalNew === 0 && (
                  <div className="bg-gray-900 rounded p-4 text-center">
                    <p className="text-gray-500 text-sm">All data is already up to date — nothing new to import.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={totalNew === 0}
                    className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Confirm &amp; Save
                    {totalNew > 0 && ` (${totalNew})`}
                  </button>
                </div>
              </section>
            )}

            {/* Saving spinner */}
            {syncState === 'saving' && <Spinner label="Saving changes to Dynasty OS…" />}

            {/* ── Done ──────────────────────────────────────────────────── */}
            {syncState === 'done' && commitResult && (
              <section className="bg-gray-800 rounded-lg p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-300">Sync Complete</h3>
                    <p className="text-gray-500 text-xs">
                      {activeSeason.year} season data updated
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Games Added', value: commitResult.gamesAdded },
                    { label: 'Players Added', value: commitResult.playersAdded },
                    { label: 'Draft Picks', value: commitResult.draftPicksAdded },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-900 rounded p-3 text-center">
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg transition-colors"
                  >
                    Sync Again
                  </button>
                  <button
                    onClick={goToDashboard}
                    className="px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </section>
            )}

            {/* ── Settings ──────────────────────────────────────────────── */}
            {(syncState === 'idle' || syncState === 'validated' || syncState === 'done') && (
              <section className="bg-gray-800/50 rounded-lg p-5 flex flex-col gap-3 border border-gray-700">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Settings
                </h2>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-gray-300">Background File Watcher</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Prompt to sync whenever the save file is modified on disk
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleWatcher(!watcherOn)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      watcherOn ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block w-3.5 h-3.5 bg-white rounded-full transform transition-transform ${
                        watcherOn ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>

                {watcherOn && savePath && (
                  <p className="text-green-600 text-xs">
                    Watching: <span className="font-mono">{savePath}</span>
                  </p>
                )}
                {watcherOn && !savePath && (
                  <p className="text-amber-600 text-xs">Select a save file above to enable watching.</p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
