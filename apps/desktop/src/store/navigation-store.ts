import { create } from 'zustand';

type Page =
  | 'dashboard'
  | 'roster'
  | 'player-profile'
  | 'legends'
  | 'records'
  | 'season-recap'
  | 'recruiting'
  | 'transfer-portal'
  | 'draft-tracker'
  | 'prestige-tracker'
  | 'rivalry-tracker'
  | 'program-timeline'
  | 'scouting-card'
  | 'trophy-room'
  | 'coaching-resume';

interface NavigationState {
  currentPage: Page;
  pageParams: Record<string, string>;
}

interface NavigationActions {
  navigate: (page: Page, params?: Record<string, string>) => void;
  goToDashboard: () => void;
  goToRoster: () => void;
  goToPlayerProfile: (playerId: string) => void;
  goToLegends: () => void;
  goToRecords: () => void;
  goToSeasonRecap: (seasonId: string) => void;
  goToRecruiting: () => void;
  goToTransferPortal: () => void;
  goToDraftTracker: () => void;
  goToPrestigeTracker: () => void;
  goToRivalryTracker: () => void;
  goToProgramTimeline: () => void;
  goToScoutingCard: () => void;
  goToTrophyRoom: () => void;
  goToCoachingResume: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentPage: 'dashboard',
  pageParams: {},

  navigate: (page: Page, params: Record<string, string> = {}) => {
    set({ currentPage: page, pageParams: params });
  },

  goToDashboard: () => {
    set({ currentPage: 'dashboard', pageParams: {} });
  },

  goToRoster: () => {
    set({ currentPage: 'roster', pageParams: {} });
  },

  goToPlayerProfile: (playerId: string) => {
    set({ currentPage: 'player-profile', pageParams: { playerId } });
  },

  goToLegends: () => {
    set({ currentPage: 'legends', pageParams: {} });
  },

  goToRecords: () => {
    set({ currentPage: 'records', pageParams: {} });
  },

  goToSeasonRecap: (seasonId: string) => {
    set({ currentPage: 'season-recap', pageParams: { seasonId } });
  },

  goToRecruiting: () => {
    set({ currentPage: 'recruiting', pageParams: {} });
  },

  goToTransferPortal: () => {
    set({ currentPage: 'transfer-portal', pageParams: {} });
  },

  goToDraftTracker: () => {
    set({ currentPage: 'draft-tracker', pageParams: {} });
  },

  goToPrestigeTracker: () => {
    set({ currentPage: 'prestige-tracker', pageParams: {} });
  },

  goToRivalryTracker: () => {
    set({ currentPage: 'rivalry-tracker', pageParams: {} });
  },

  goToProgramTimeline: () => {
    set({ currentPage: 'program-timeline', pageParams: {} });
  },

  goToScoutingCard: () => {
    set({ currentPage: 'scouting-card', pageParams: {} });
  },

  goToTrophyRoom: () => {
    set({ currentPage: 'trophy-room', pageParams: {} });
  },

  goToCoachingResume: () => {
    set({ currentPage: 'coaching-resume', pageParams: {} });
  },
}));
