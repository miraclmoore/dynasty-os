import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigationStore } from '../store/navigation-store';

interface TourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'dynasty-os-onboarding-v2';
const SPOTLIGHT_PAD = 8; // px around the highlighted element

interface TourStep {
  title: string;
  body: string;
  tip?: string | null;
  targetId: string | null; // data-tour-id value, or null for centered card
  page: 'dashboard' | 'roster';
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to Dynasty OS',
    body: "You're the head coach. This is your permanent record — every game, every player, every season, stored locally on your machine. Let's take a quick look around.",
    tip: null,
    targetId: null,
    page: 'dashboard',
  },
  {
    title: 'Your Command Center',
    body: 'The sidebar is your home base. Navigation to every feature lives here — season tools, roster, program history, and sport-specific extras like Recruiting or Franchise Sync.',
    tip: null,
    targetId: 'tour-sidebar',
    page: 'dashboard',
  },
  {
    title: 'Log Your First Game',
    body: 'After every game, hit "+ Log Game" to record the result. Your record updates automatically and feeds the season stats, activity feed, and AI recap.',
    tip: null,
    targetId: 'tour-log-game',
    page: 'dashboard',
  },
  {
    title: 'Close Out the Season',
    body: 'When the season is over, hit "End Season" to lock in your final ranking, bowl game or playoff result, and trigger the optional AI narrative recap.',
    tip: 'The Season Checklist on the dashboard walks you through every step before you close the year.',
    targetId: 'tour-end-season',
    page: 'dashboard',
  },
  {
    title: 'Quick Entry Hub',
    body: 'The Quick Entry Hub is your shortcut panel — log games, manage players, sync franchise data, and more from one place. Sections light up as you add data.',
    tip: null,
    targetId: 'tour-quick-entry',
    page: 'dashboard',
  },
  {
    title: 'Season at a Glance',
    body: 'Your live record, conference standing, and current ranking — updated automatically after every logged game. The scoreboard for your season.',
    tip: null,
    targetId: 'tour-season-at-glance',
    page: 'dashboard',
  },
  {
    title: 'Recent Activity',
    body: 'The last five game results at a glance — your win streak, scores, and momentum. A quick read on how the season is trending.',
    tip: null,
    targetId: 'tour-recent-activity',
    page: 'dashboard',
  },
  {
    title: 'Weekly Snapshot',
    body: "Tells you what week you're on and surfaces the next opponent so you always know where you are in the schedule.",
    tip: null,
    targetId: 'tour-weekly-snapshot',
    page: 'dashboard',
  },
  {
    title: 'Stat Highlights',
    body: 'Running totals and season averages — points per game, total wins, scoring streaks — derived from your game log automatically.',
    tip: null,
    targetId: 'tour-stat-highlights',
    page: 'dashboard',
  },
  {
    title: 'Season Checklist',
    body: 'A guided checklist of annual tasks: log games, end the season, generate a recap, and more. Green dots appear when your data confirms the step is done.',
    tip: null,
    targetId: 'tour-checklist',
    page: 'dashboard',
  },
  {
    title: 'Game Log',
    body: "Every game you've logged lives here — score, result, week, notes, and an optional AI recap. Inline editing lets you correct scores without leaving the dashboard.",
    tip: null,
    targetId: 'tour-gamelog',
    page: 'dashboard',
  },
  {
    title: "You're the Coach Now",
    body: 'Your dynasty starts now. Use Cmd+K to jump anywhere instantly, or tap the ? button any time to replay this tour.',
    tip: 'CFB coaches unlock Recruiting, Transfer Portal, NFL Draft Tracker, and more from the sidebar.',
    targetId: null,
    page: 'dashboard',
  },
];

interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay({ isOpen, onClose }: TourOverlayProps) {
  const [step, setStep] = useState(0);
  const [bounds, setBounds] = useState<SpotlightBounds | null>(null);
  const [ready, setReady] = useState(false); // true once element found after nav
  const rafRef = useRef<number | null>(null);
  const currentPage = useNavigationStore((s) => s.currentPage);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Navigate and resolve the target element whenever step changes
  useEffect(() => {
    if (!isOpen) return;

    // If no target, show centered card immediately — no polling needed
    if (!currentStep.targetId) {
      setBounds(null);
      setReady(true);
      return;
    }

    setReady(false);
    setBounds(null);

    // Navigate to the right page if needed
    const nav = useNavigationStore.getState();
    if (currentStep.page === 'dashboard' && currentPage !== 'dashboard') {
      nav.navigate('dashboard');
    }

    // Poll for element with rAF (max ~600ms at 60fps = 36 frames)
    let attempts = 0;
    const maxAttempts = 36;

    const poll = () => {
      attempts++;
      const el = document.querySelector(`[data-tour-id="${currentStep.targetId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setBounds({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        setReady(true);
        return;
      }
      if (attempts < maxAttempts) {
        rafRef.current = requestAnimationFrame(poll);
      } else {
        // Element not found — still show card centered rather than blocking
        setReady(true);
      }
    };

    rafRef.current = requestAnimationFrame(poll);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [step, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'complete');
    setStep(0);
    setBounds(null);
    // If we're on the roster page, navigate back to dashboard before closing
    const nav = useNavigationStore.getState();
    const page = useNavigationStore.getState().currentPage;
    if (page !== 'dashboard') nav.navigate('dashboard');
    onClose();
  }, [onClose]);

  const handleNext = () => {
    if (isLast) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => s - 1);

  if (!isOpen) return null;

  // Spotlight geometry
  const pad = SPOTLIGHT_PAD;
  const hasBounds = bounds !== null && ready;
  const spotTop = hasBounds ? bounds.top - pad : 0;
  const spotLeft = hasBounds ? bounds.left - pad : 0;
  const spotW = hasBounds ? bounds.width + pad * 2 : 0;
  const spotH = hasBounds ? bounds.height + pad * 2 : 0;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Card position: below by default, above if no room, always clamped to viewport
  const cardWidth = 360;
  const cardEstHeight = 220;
  const cardMargin = 12;
  const spaceBelow = hasBounds ? vh - (spotTop + spotH) : vh;
  const spaceAbove = hasBounds ? spotTop : vh;
  const showBelow = !hasBounds || spaceBelow >= cardEstHeight + 24 || spaceBelow >= spaceAbove;
  const rawCardTop = hasBounds
    ? showBelow
      ? spotTop + spotH + 16
      : spotTop - cardEstHeight - 16
    : vh / 2 - cardEstHeight / 2;
  // Always clamp so the card stays fully on-screen
  const cardTop = Math.max(cardMargin, Math.min(rawCardTop, vh - cardEstHeight - cardMargin));
  const cardLeft = Math.max(
    cardMargin,
    Math.min(
      hasBounds ? spotLeft + spotW / 2 - cardWidth / 2 : vw / 2 - cardWidth / 2,
      vw - cardWidth - cardMargin,
    ),
  );

  return (
    <>
      {/* Overlay pieces — 4 divs that cover everything outside the spotlight */}
      {hasBounds ? (
        <>
          {/* Top */}
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: spotTop, background: 'rgba(0,0,0,0.72)', zIndex: 9000 }}
          />
          {/* Bottom */}
          <div
            style={{ position: 'fixed', top: spotTop + spotH, left: 0, width: '100%', bottom: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9000 }}
          />
          {/* Left strip */}
          <div
            style={{ position: 'fixed', top: spotTop, left: 0, width: spotLeft, height: spotH, background: 'rgba(0,0,0,0.72)', zIndex: 9000 }}
          />
          {/* Right strip */}
          <div
            style={{ position: 'fixed', top: spotTop, left: spotLeft + spotW, right: 0, height: spotH, background: 'rgba(0,0,0,0.72)', zIndex: 9000 }}
          />
          {/* Highlight ring */}
          <div
            style={{
              position: 'fixed',
              top: spotTop,
              left: spotLeft,
              width: spotW,
              height: spotH,
              border: '2px solid #3b82f6',
              borderRadius: 10,
              boxShadow: '0 0 0 1px rgba(59,130,246,0.3), 0 0 24px rgba(59,130,246,0.25)',
              pointerEvents: 'none',
              zIndex: 9001,
            }}
          />
        </>
      ) : (
        /* Full dark backdrop when no target */
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9000 }}
        />
      )}

      {/* Tour card */}
      {ready && (
        <div
          style={{
            position: 'fixed',
            top: cardTop,
            left: cardLeft,
            width: cardWidth,
            zIndex: 9002,
          }}
          className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-5"
        >
          {/* Skip */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip tour
          </button>

          {/* Step counter */}
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
            Step {step + 1} of {STEPS.length}
          </div>

          <h2 className="text-base font-bold text-white mb-2">{currentStep.title}</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{currentStep.body}</p>

          {currentStep.tip && (
            <div className="mt-3 px-3 py-2 bg-blue-950/50 border border-blue-800/50 rounded-lg text-xs text-blue-300 leading-relaxed">
              {currentStep.tip}
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-700"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {isLast ? "Let's go" : 'Next'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
