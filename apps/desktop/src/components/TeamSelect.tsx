import React, { useState, useRef, useEffect } from 'react';
import { getSportConfig } from '@dynasty-os/sport-configs';
import type { SportType } from '@dynasty-os/core-types';

interface TeamSelectProps {
  sport: SportType;
  value: string;
  onChange: (teamName: string, conference: string) => void;
  placeholder?: string;
}

export function TeamSelect({
  sport,
  value,
  onChange,
  placeholder = 'Select opponent...',
}: TeamSelectProps) {
  const config = getSportConfig(sport);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display text when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = query.trim()
    ? config.teams.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase())
      )
    : config.teams;

  // Group filtered teams by conference
  const byConference = filtered.reduce<Record<string, typeof config.teams>>(
    (acc, team) => {
      if (!acc[team.conference]) acc[team.conference] = [];
      acc[team.conference].push(team);
      return acc;
    },
    {}
  );
  const conferenceKeys = Object.keys(byConference).sort();

  function handleSelect(teamName: string, conference: string) {
    setQuery(teamName);
    onChange(teamName, conference);
    setOpen(false);
  }

  function handleBlur() {
    // Small delay so click on option registers before close
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {conferenceKeys.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-sm">No teams found</div>
          ) : (
            conferenceKeys.map((conf) => (
              <div key={conf}>
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50 sticky top-0">
                  {conf}
                </div>
                {byConference[conf].map((team) => (
                  <button
                    key={team.name}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center justify-between gap-2"
                    onMouseDown={() => handleSelect(team.name, team.conference)}
                  >
                    <span>{team.name}</span>
                    <span className="text-gray-500 text-xs shrink-0">{team.conference}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
