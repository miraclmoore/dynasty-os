import { create } from 'zustand';
import { fetchTickerData, type TickerLeague, type TickerData } from '../lib/ticker-service';

const REFRESH_INTERVAL_MS = 60_000; // 60 seconds
const REFRESH_LIVE_MS = 20_000;     // 20 seconds when games are live

interface TickerStore {
  league: TickerLeague;
  data: TickerData | null;
  loading: boolean;
  visible: boolean;
  tab: 'scores' | 'news';
  _timerId: ReturnType<typeof setInterval> | null;

  setLeague: (league: TickerLeague) => void;
  setTab: (tab: 'scores' | 'news') => void;
  setVisible: (v: boolean) => void;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useTickerStore = create<TickerStore>((set, get) => ({
  league: 'nfl',
  data: null,
  loading: false,
  visible: true,
  tab: 'scores',
  _timerId: null,

  setLeague: (league) => {
    set({ league, data: null });
    get().refresh();
  },

  setTab: (tab) => set({ tab }),

  setVisible: (visible) => set({ visible }),

  refresh: async () => {
    const { league } = get();
    set({ loading: true });
    const data = await fetchTickerData(league);
    set({ data, loading: false });

    // Reschedule with shorter interval if games are live
    const { _timerId, startPolling } = get();
    if (_timerId) {
      clearInterval(_timerId);
      set({ _timerId: null });
      startPolling();
    }
  },

  startPolling: () => {
    const { _timerId, refresh, data } = get();
    if (_timerId) return;
    // Do an immediate fetch
    refresh();
    const interval = data?.hasLiveGames ? REFRESH_LIVE_MS : REFRESH_INTERVAL_MS;
    const id = setInterval(() => {
      get().refresh();
    }, interval);
    set({ _timerId: id });
  },

  stopPolling: () => {
    const { _timerId } = get();
    if (_timerId) {
      clearInterval(_timerId);
      set({ _timerId: null });
    }
  },
}));
