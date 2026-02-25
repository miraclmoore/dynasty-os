import React, { useRef, useState } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    title: 'Welcome to Dynasty OS',
    body: "You're the head coach. This is your permanent record — every game, every player, every season, stored locally on your machine. Nothing leaves your computer.",
    tip: null,
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    title: 'The Dashboard',
    body: 'Your command center. The left column is navigation — use it to reach every feature. The right column shows your season at a glance with stats, recent activity, and your season checklist.',
    tip: null,
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'The Season Loop',
    body: 'Log games → they auto-calculate your record. Hit End Season → fill in bowl/playoff result and final ranking. Generate an AI recap narrative when the season is done.',
    tip: 'The Season Checklist on your dashboard guides you through each step.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Your Roster',
    body: 'Add players and track their stats season by season. Long-tenured stars earn Legacy Cards with AI-generated career blurbs — a permanent record of their time in your program.',
    tip: null,
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: 'Tools & Features',
    body: 'Use Cmd+K to jump anywhere instantly. Season Checklist on the Dashboard guides you through each annual workflow. Everything is sport-aware — CFB and Madden have their own exclusive features.',
    tip: 'CFB coaches get Recruiting, Transfer Portal, NFL Draft Tracker, and more.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    title: "You're the Coach Now",
    body: 'Your dynasty starts now. Build your program, track every milestone, and write your legacy. You can revisit this tour any time from the Help menu.',
    tip: null,
  },
];

const STORAGE_KEY = 'dynasty-os-onboarding-v1';

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const dismissedRef = useRef(false);

  if (!isOpen) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'complete');
    dismissedRef.current = true;
    setStep(0);
    onClose();
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'complete');
    dismissedRef.current = true;
    setStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={skip} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 mx-4">
        {/* Skip link */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip tour
        </button>

        {/* Icon + content */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-5 shadow-inner">
            {current.icon}
          </div>

          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="text-xl font-bold text-white mb-3">{current.title}</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{current.body}</p>

          {current.tip && (
            <div className="mt-4 px-4 py-2.5 bg-blue-950/50 border border-blue-800/50 rounded-lg text-xs text-blue-300 leading-relaxed">
              {current.tip}
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-700"
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={finish}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Let's go
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
