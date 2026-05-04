import { create } from 'zustand';

export interface KeyMoment {
  year: number;
  description: string;
}

export interface WizardState {
  dismissed: boolean;
  completedSteps: number[];
}

export interface PrefsState {
  hasApiKey: boolean;
  maddenSavePath: string | null;
  maddenWatcherEnabled: boolean;
  autoExportEnabled: Record<string, boolean>;       // keyed by dynastyId
  setupWizardState: Record<string, WizardState>;    // keyed by dynastyId
  tourComplete: boolean;
  onboardingComplete: boolean;
  checklistState: Record<string, Record<string, boolean>>; // keyed by seasonId
  rivalKeyMoments: Record<string, KeyMoment[]>;     // keyed by rivalId
}

export interface PrefsActions {
  setHasApiKey: (v: boolean) => void;
  setMaddenSavePath: (path: string | null) => void;
  setMaddenWatcherEnabled: (v: boolean) => void;
  setAutoExportEnabled: (dynastyId: string, enabled: boolean) => void;
  setSetupWizardState: (dynastyId: string, state: WizardState) => void;
  setTourComplete: (v: boolean) => void;
  setOnboardingComplete: (v: boolean) => void;
  setChecklistState: (seasonId: string, state: Record<string, boolean>) => void;
  setRivalKeyMoments: (rivalId: string, moments: KeyMoment[]) => void;
}

export const usePrefsStore = create<PrefsState & PrefsActions>((set) => ({
  hasApiKey: false,
  maddenSavePath: null,
  maddenWatcherEnabled: false,
  autoExportEnabled: {},
  setupWizardState: {},
  tourComplete: false,
  onboardingComplete: false,
  checklistState: {},
  rivalKeyMoments: {},

  setHasApiKey: (v) => set({ hasApiKey: v }),
  setMaddenSavePath: (path) => set({ maddenSavePath: path }),
  setMaddenWatcherEnabled: (v) => set({ maddenWatcherEnabled: v }),
  setAutoExportEnabled: (dynastyId, enabled) =>
    set((s) => ({ autoExportEnabled: { ...s.autoExportEnabled, [dynastyId]: enabled } })),
  setSetupWizardState: (dynastyId, state) =>
    set((s) => ({ setupWizardState: { ...s.setupWizardState, [dynastyId]: state } })),
  setTourComplete: (v) => set({ tourComplete: v }),
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
  setChecklistState: (seasonId, state) =>
    set((s) => ({ checklistState: { ...s.checklistState, [seasonId]: state } })),
  setRivalKeyMoments: (rivalId, moments) =>
    set((s) => ({ rivalKeyMoments: { ...s.rivalKeyMoments, [rivalId]: moments } })),
}));
