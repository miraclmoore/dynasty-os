import React, { useEffect, useRef } from 'react';
import { useTickerStore } from '../store/ticker-store';

// ── Score item pill ───────────────────────────────────────────────────────────

function ScorePill({ item }: { item: { awayAbbr: string; homeAbbr: string; awayScore: string; homeScore: string; statusText: string; isLive: boolean; isFinal: boolean } }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 whitespace-nowrap text-xs">
      <span className="text-gray-300 font-medium">
        {item.awayAbbr} <span className={item.isFinal || item.isLive ? 'text-white font-bold' : 'text-gray-500'}>{item.awayScore}</span>
      </span>
      <span className="text-gray-600">@</span>
      <span className="text-gray-300 font-medium">
        {item.homeAbbr} <span className={item.isFinal || item.isLive ? 'text-white font-bold' : 'text-gray-500'}>{item.homeScore}</span>
      </span>
      <span className={`text-xs ${item.isLive ? 'text-green-400' : 'text-gray-500'}`}>
        {item.statusText}
      </span>
      <span className="text-gray-700 ml-1">·</span>
    </span>
  );
}

// ── News item ─────────────────────────────────────────────────────────────────

function NewsHeadline({ item }: { item: { id: string; headline: string } }) {
  return (
    <span className="inline-flex items-center px-4 whitespace-nowrap text-xs text-gray-300">
      {item.headline}
      <span className="text-gray-700 ml-4">·</span>
    </span>
  );
}

// ── Scrolling track ───────────────────────────────────────────────────────────

function ScrollingTrack({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Duplicate children for seamless looping
    const clone = el.cloneNode(true) as HTMLDivElement;
    el.parentElement?.appendChild(clone);
    return () => {
      clone.remove();
    };
  }, [children]);

  return (
    <div className="overflow-hidden flex-1 relative">
      <div
        className="flex"
        style={{ animation: 'ticker-scroll 40s linear infinite' }}
      >
        <div ref={trackRef} className="flex shrink-0">
          {children}
        </div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main ticker bar ───────────────────────────────────────────────────────────

export function TickerBar() {
  const { league, data, loading, visible, tab, setLeague, setTab, setVisible, startPolling, stopPolling } = useTickerStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-0 right-4 h-6 px-3 bg-gray-800 border border-gray-700 rounded-t text-xs text-gray-500 hover:text-gray-300 transition-colors z-40"
      >
        Show Ticker
      </button>
    );
  }

  const hasLive = data?.hasLiveGames ?? false;
  const scores = data?.scores ?? [];
  const news = data?.news ?? [];
  const isEmpty = tab === 'scores' ? scores.length === 0 : news.length === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-gray-900 border-t border-gray-800 flex items-center z-40 select-none">
      {/* League toggle */}
      <div className="flex items-center gap-0.5 px-2 shrink-0 border-r border-gray-800">
        <button
          onClick={() => setLeague('nfl')}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
            league === 'nfl' ? 'bg-green-800 text-green-200' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          NFL
        </button>
        <button
          onClick={() => setLeague('ncaa')}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
            league === 'ncaa' ? 'bg-orange-800 text-orange-200' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          CFB
        </button>
      </div>

      {/* Scores / News tabs */}
      <div className="flex items-center gap-0.5 px-2 shrink-0 border-r border-gray-800">
        <button
          onClick={() => setTab('scores')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            tab === 'scores' ? 'text-white' : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          Scores
        </button>
        <button
          onClick={() => setTab('news')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            tab === 'news' ? 'text-white' : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          News
        </button>
      </div>

      {/* Live badge */}
      {hasLive && tab === 'scores' && (
        <div className="flex items-center gap-1 px-2 shrink-0 border-r border-gray-800">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-bold">LIVE</span>
        </div>
      )}

      {/* Scrolling content */}
      {loading && !data ? (
        <div className="flex-1 px-4 text-xs text-gray-600 animate-pulse">Loading scores…</div>
      ) : isEmpty ? (
        <div className="flex-1 px-4 text-xs text-gray-600">
          {tab === 'scores' ? 'No games today' : 'No news available'}
        </div>
      ) : (
        <ScrollingTrack key={`${league}-${tab}`}>
          {tab === 'scores'
            ? scores.map((s) => <ScorePill key={s.id} item={s} />)
            : news.map((n) => <NewsHeadline key={n.id} item={n} />)}
        </ScrollingTrack>
      )}

      {/* Hide button */}
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 px-2 text-gray-700 hover:text-gray-500 transition-colors border-l border-gray-800 h-full flex items-center"
        title="Hide ticker"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
