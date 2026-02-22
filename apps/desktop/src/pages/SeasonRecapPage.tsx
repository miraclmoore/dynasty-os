import React, { useEffect, useState } from 'react';
import { useDynastyStore } from '../store';
import { useSeasonStore } from '../store/season-store';
import { useNarrativeStore } from '../store/narrative-store';
import { useNavigationStore } from '../store/navigation-store';
import { getApiKey, setApiKey } from '../lib/legacy-card-service';
import type { NarrativeTone } from '../lib/narrative-service';

// ── Tone config ─────────────────────────────────────────────────────────────

interface ToneOption {
  id: NarrativeTone;
  label: string;
  description: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'espn',
    label: 'ESPN National Desk',
    description: 'Authoritative national broadcast perspective',
  },
  {
    id: 'hometown',
    label: 'Hometown Beat Reporter',
    description: 'Warm community-focused local coverage',
  },
  {
    id: 'legend',
    label: 'Dynasty Mode Legend',
    description: 'Epic dynasty-builder narrative',
  },
];

const TONE_LABELS: Record<NarrativeTone, string> = {
  espn: 'ESPN National Desk',
  hometown: 'Hometown Beat',
  legend: 'Legend',
};

// ── Helper ───────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function SeasonRecapPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const { activeSeason, seasons } = useSeasonStore();
  const goToDashboard = useNavigationStore((s) => s.goToDashboard);
  const pageParams = useNavigationStore((s) => s.pageParams);

  const { narrative, loading, error } = useNarrativeStore();

  const [selectedTone, setSelectedTone] = useState<NarrativeTone>('espn');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => Boolean(getApiKey()));
  const [apiKeySaving, setApiKeySaving] = useState(false);

  // Resolve the season from pageParams.seasonId
  const seasonId = pageParams.seasonId;
  const season =
    activeSeason?.id === seasonId
      ? activeSeason
      : seasons.find((s) => s.id === seasonId) ?? activeSeason;

  // Load seasons if not yet loaded
  useEffect(() => {
    if (!activeDynasty) return;
    if (seasons.length === 0) {
      useSeasonStore.getState().loadSeasons(activeDynasty.id);
    }
  }, [activeDynasty?.id, seasons.length]);

  // Load cached narrative on mount and sync tone selector to cached tone
  useEffect(() => {
    if (!seasonId) return;
    useNarrativeStore.getState().loadCachedNarrative(seasonId);
  }, [seasonId]);

  // When a cached narrative is loaded, sync the tone selector to match
  useEffect(() => {
    if (narrative) {
      setSelectedTone(narrative.tone);
    }
  }, [narrative?.tone]);

  if (!activeDynasty) return null;

  // ── API key setup prompt ────────────────────────────────────────────────

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setApiKeySaving(true);
    setApiKey(trimmed);
    setHasApiKey(true);
    setApiKeyInput('');
    setApiKeySaving(false);
  };

  // ── Generate / Regenerate ───────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!activeDynasty || !season) return;
    const forceRefresh = Boolean(narrative);
    await useNarrativeStore.getState().generate(activeDynasty, season, selectedTone, forceRefresh);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const isGenerating = loading;
  const hasNarrative = Boolean(narrative);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={goToDashboard}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Season Recap</h1>
            {season && (
              <p className="text-sm text-gray-400 mt-0.5">
                {activeDynasty.teamName} &mdash; {season.year} Season
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* API key prompt */}
        {!hasApiKey && (
          <div className="bg-gray-800 rounded-lg p-5 border border-amber-600/40">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-1">
              Anthropic API Key Required
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Season Recap uses Claude to generate narratives. Enter your Anthropic API key to
              get started. Your key is stored locally and never sent anywhere except Anthropic.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || apiKeySaving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Save Key
              </button>
            </div>
          </div>
        )}

        {/* Season summary context card */}
        {season && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Season Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Year</p>
                <p className="text-lg font-bold text-white">{season.year}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Record</p>
                <p className="text-lg font-bold text-white">
                  {season.wins}-{season.losses}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Conf Record</p>
                <p className="text-lg font-bold text-white">
                  {season.confWins}-{season.confLosses}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Final Ranking</p>
                <p className="text-lg font-bold text-white">
                  {season.finalRanking ? `#${season.finalRanking}` : 'Unranked'}
                </p>
              </div>
              {(season.bowlGame || season.playoffResult) && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs text-gray-500 mb-0.5">Postseason</p>
                  <p className="text-sm text-gray-200">
                    {season.bowlGame
                      ? `${season.bowlGame} — ${season.bowlResult === 'W' ? 'Win' : season.bowlResult === 'L' ? 'Loss' : 'Result unknown'}`
                      : ''}
                    {season.playoffResult ? ` ${season.playoffResult}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tone selector */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Narrative Tone
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
                disabled={isGenerating}
                className={[
                  'text-left p-4 rounded-lg border-2 transition-all',
                  selectedTone === tone.id
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'border-gray-700 bg-gray-700/40 hover:border-gray-600',
                  isGenerating ? 'opacity-50 cursor-not-allowed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <p
                  className={[
                    'text-sm font-semibold mb-1',
                    selectedTone === tone.id ? 'text-amber-400' : 'text-gray-200',
                  ].join(' ')}
                >
                  {tone.label}
                </p>
                <p className="text-xs text-gray-400 leading-snug">{tone.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Generate / Regenerate button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !hasApiKey || !season}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors min-w-[200px]"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating your season story...
              </span>
            ) : hasNarrative ? (
              `Regenerate as ${TONE_LABELS[selectedTone]}`
            ) : (
              'Generate Season Recap'
            )}
          </button>
        </div>

        {/* Error state */}
        {error && !isGenerating && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-center">
            <p className="text-red-300 text-sm mb-3">
              {error.includes('API key')
                ? 'Could not generate recap. Check your API key and try again.'
                : 'Could not generate recap. Check your API key and try again.'}
            </p>
            <button
              onClick={handleGenerate}
              disabled={!hasApiKey || !season}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Narrative display */}
        {narrative && !isGenerating && (
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col gap-5">
            {/* Tone badge + timestamp */}
            <div className="flex items-center justify-between gap-3">
              <span className="inline-block px-3 py-1 bg-amber-900/40 border border-amber-700/40 text-amber-400 text-xs font-semibold rounded-full">
                {TONE_LABELS[narrative.tone]}
              </span>
              <span className="text-xs text-gray-500">
                Generated on {formatDate(narrative.generatedAt)}
              </span>
            </div>

            {/* Tagline */}
            <div className="text-center py-4 border-t border-b border-gray-700/50">
              <p className="text-3xl font-bold text-amber-400 tracking-tight">
                {narrative.tagline
                  .split(' ')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </p>
            </div>

            {/* Recap paragraphs */}
            <div className="max-w-3xl mx-auto w-full">
              {narrative.recap.split('\n\n').map((para, i) => (
                <p
                  key={i}
                  className="text-gray-200 leading-relaxed text-base mb-4 last:mb-0"
                >
                  {para.trim()}
                </p>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
