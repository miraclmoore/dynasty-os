import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { usePlayerStore } from '../store/player-store';
import { useRecruitingStore } from '../store/recruiting-store';
import { useNavigationStore } from '../store/navigation-store';
import { AUTO_OPEN_ADD_PLAYER_KEY } from './QuickEntryHub';

const WIZARD_KEY = (dynastyId: string) => `dynasty-os-setup-wizard-${dynastyId}`;

interface WizardState {
  dismissed: boolean;
  completedSteps: number[];
}

function getWizardState(dynastyId: string): WizardState {
  try {
    const stored = localStorage.getItem(WIZARD_KEY(dynastyId));
    return stored
      ? (JSON.parse(stored) as WizardState)
      : { dismissed: false, completedSteps: [] };
  } catch {
    return { dismissed: false, completedSteps: [] };
  }
}

function saveWizardState(dynastyId: string, state: WizardState) {
  localStorage.setItem(WIZARD_KEY(dynastyId), JSON.stringify(state));
}

interface SetupWizardProps {
  dynastyId: string;
  sport: string;
  onLogGame: () => void;
}

export function SetupWizard({ dynastyId, sport, onLogGame }: SetupWizardProps) {
  const isCfb = sport === 'cfb';
  const isMadden = sport === 'madden';

  const games = useGameStore((s) => s.games);
  const players = usePlayerStore((s) => s.players);
  const classes = useRecruitingStore((s) => s.classes);

  const [wizardState, setWizardState] = useState<WizardState>(() =>
    getWizardState(dynastyId)
  );

  // Auto-complete steps if the relevant data already exists
  useEffect(() => {
    if (wizardState.dismissed) return;
    const next = { ...wizardState, completedSteps: [...wizardState.completedSteps] };
    let changed = false;

    if (!next.completedSteps.includes(0) && games.length > 0) {
      next.completedSteps.push(0);
      changed = true;
    }
    if (!next.completedSteps.includes(1) && players.length > 0) {
      next.completedSteps.push(1);
      changed = true;
    }
    if (!next.completedSteps.includes(2) && isCfb && classes.length > 0) {
      next.completedSteps.push(2);
      changed = true;
    }

    if (changed) {
      saveWizardState(dynastyId, next);
      setWizardState(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length, players.length, classes.length]);

  if (wizardState.dismissed) return null;

  const nav = useNavigationStore.getState();

  function markStep(index: number) {
    const next: WizardState = {
      ...wizardState,
      completedSteps: [
        ...wizardState.completedSteps.filter((s) => s !== index),
        index,
      ],
    };
    saveWizardState(dynastyId, next);
    setWizardState(next);
  }

  function handleSkip() {
    markStep(activeStep);
  }

  function handleDismiss() {
    const next: WizardState = { dismissed: true, completedSteps: wizardState.completedSteps };
    saveWizardState(dynastyId, next);
    setWizardState(next);
  }

  const steps = [
    {
      title: 'Log your first game',
      description:
        'Record your first win (or loss). Your record, streak, and stats update automatically.',
      cta: 'Log Game',
      action: () => {
        markStep(0);
        onLogGame();
      },
    },
    {
      title: 'Add your roster',
      description: 'Add players so you can track their season stats and career arcs.',
      cta: 'Add Player',
      action: () => {
        markStep(1);
        localStorage.setItem(AUTO_OPEN_ADD_PLAYER_KEY, 'true');
        nav.goToRoster();
      },
    },
    isCfb
      ? {
          title: 'Set up recruiting',
          description: 'Create your recruiting class and start logging commits and star ratings.',
          cta: 'Go to Recruiting',
          action: () => {
            markStep(2);
            nav.goToRecruiting();
          },
        }
      : isMadden
      ? {
          title: 'Sync franchise data',
          description: 'Import your Madden franchise save for automatic roster and stats sync.',
          cta: 'Sync Franchise',
          action: () => {
            markStep(2);
            nav.goToMaddenSync();
          },
        }
      : {
          title: 'Explore your program',
          description:
            'Check the sidebar to find coaching staff, future schedule, and more tools.',
          cta: 'Got it',
          action: () => markStep(2),
        },
    {
      title: "You're all set",
      description:
        'Dynasty OS is ready. Use the sidebar to explore every feature, or check the Season Checklist on the dashboard.',
      cta: 'Finish Setup',
      action: () => handleDismiss(),
    },
  ];

  const activeStep = (() => {
    for (let i = 0; i < steps.length; i++) {
      if (!wizardState.completedSteps.includes(i)) return i;
    }
    return steps.length - 1;
  })();

  const current = steps[activeStep];

  return (
    <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Get started with Dynasty OS</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            A few quick steps to set up your dynasty
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5"
          aria-label="Dismiss setup wizard"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const done = wizardState.completedSteps.includes(i);
          const active = i === activeStep;
          return (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    done
                      ? 'bg-green-500 text-white'
                      : active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  {done ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs hidden sm:block truncate max-w-[100px] ${
                    active
                      ? 'text-white font-medium'
                      : done
                      ? 'text-gray-600 line-through'
                      : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px min-w-[8px] mx-0.5 ${
                    wizardState.completedSteps.includes(i) ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active step content */}
      <div className="flex items-center justify-between gap-4 bg-gray-800/50 rounded-lg px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-200">{current.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{current.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeStep < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={current.action}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            {current.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
