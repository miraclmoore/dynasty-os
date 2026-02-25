import React, { useState } from 'react';
import { useDynastyStore } from '../store';
import {
  buildBracket,
  pickWinner,
  type Bracket,
  type BracketSize,
  type BracketMatchup,
  type BracketTeam,
} from '../lib/playoff-bracket';

const BRACKET_SIZES: BracketSize[] = [4, 8, 12];

const ROUND_LABELS: Record<number, Record<number, string>> = {
  4: { 1: 'Semifinals', 2: 'Championship' },
  8: { 1: 'Quarterfinals', 2: 'Semifinals', 3: 'Championship' },
  12: { 1: 'First Round', 2: 'Quarterfinals', 3: 'Semifinals', 4: 'Championship' },
};

function defaultTeamInputs(size: number): string[] {
  return Array.from({ length: size }, (_, i) => `Team ${i + 1}`);
}

export function PlayoffSimulatorPage() {
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);

  // CFB-only guard
  if (!activeDynasty || activeDynasty.sport !== 'cfb') return null;

  return <PlayoffSimulatorContent dynastyName={activeDynasty.teamName} />;
}

// Separate component so hooks run unconditionally after the guard
function PlayoffSimulatorContent({ dynastyName }: { dynastyName: string }) {
  const [bracketSize, setBracketSize] = useState<BracketSize>(12);
  const [teamInputs, setTeamInputs] = useState<string[]>(defaultTeamInputs(12));
  const [bracket, setBracket] = useState<Bracket | null>(null);

  const handleSizeChange = (size: BracketSize) => {
    setBracketSize(size);
    setTeamInputs(defaultTeamInputs(size));
    setBracket(null);
  };

  const handleTeamInput = (idx: number, value: string) => {
    setTeamInputs((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleStart = () => {
    const teams: BracketTeam[] = teamInputs.map((name, i) => ({
      seed: i + 1,
      name: name.trim() || `Seed ${i + 1}`,
    }));
    setBracket(buildBracket(teams));
  };

  const handlePickWinner = (matchupId: string, winner: BracketTeam) => {
    if (!bracket) return;
    setBracket(pickWinner(bracket, matchupId, winner));
  };

  const handleReset = () => {
    setBracket(null);
    setTeamInputs(defaultTeamInputs(bracketSize));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Playoff Simulator</h1>
        <p className="text-gray-400 text-sm mt-1">{dynastyName} — CFB Playoff Bracket</p>
      </div>

      {!bracket ? (
        <SetupPhase
          bracketSize={bracketSize}
          teamInputs={teamInputs}
          onSizeChange={handleSizeChange}
          onTeamInput={handleTeamInput}
          onStart={handleStart}
        />
      ) : (
        <ActiveBracket
          bracket={bracket}
          onPickWinner={handlePickWinner}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// --- Setup Phase ---

interface SetupPhaseProps {
  bracketSize: BracketSize;
  teamInputs: string[];
  onSizeChange: (size: BracketSize) => void;
  onTeamInput: (idx: number, value: string) => void;
  onStart: () => void;
}

function SetupPhase({ bracketSize, teamInputs, onSizeChange, onTeamInput, onStart }: SetupPhaseProps) {
  return (
    <div className="max-w-2xl">
      {/* Bracket size selector */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-300 mb-2">Bracket Size</p>
        <div className="flex gap-3">
          {BRACKET_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(size)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                bracketSize === size
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {size} Teams
            </button>
          ))}
        </div>
      </div>

      {/* Team name inputs */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-300 mb-2">Team Names (Seeded 1 → {bracketSize})</p>
        <div className="grid grid-cols-2 gap-2">
          {teamInputs.map((name, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">Seed {idx + 1}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => onTeamInput(idx, e.target.value)}
                placeholder={`Seed ${idx + 1}`}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-sm transition-colors"
      >
        Start Bracket
      </button>
    </div>
  );
}

// --- Active Bracket ---

interface ActiveBracketProps {
  bracket: Bracket;
  onPickWinner: (matchupId: string, winner: BracketTeam) => void;
  onReset: () => void;
}

function ActiveBracket({ bracket, onPickWinner, onReset }: ActiveBracketProps) {
  const roundLabels = ROUND_LABELS[bracket.size] ?? {};

  return (
    <div>
      {/* Champion banner */}
      {bracket.champion && (
        <div className="mb-6 p-4 bg-amber-600/20 border border-amber-500 rounded-xl text-center">
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">Champion</p>
          <p className="text-3xl font-bold text-amber-300">{bracket.champion.name}</p>
          <p className="text-sm text-amber-500 mt-1">Seed #{bracket.champion.seed}</p>
        </div>
      )}

      {/* Rounds — horizontal scroll */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {bracket.rounds.map((round, ri) => (
          <div key={ri} className="flex flex-col gap-3 min-w-[200px]">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold text-center">
              {roundLabels[ri + 1] ?? `Round ${ri + 1}`}
            </p>
            <div className="flex flex-col gap-3">
              {round.map((matchup) => (
                <MatchupCard
                  key={matchup.id}
                  matchup={matchup}
                  onPickWinner={onPickWinner}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reset */}
      <div className="mt-6">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          Reset Bracket
        </button>
      </div>
    </div>
  );
}

// --- Matchup Card ---

interface MatchupCardProps {
  matchup: BracketMatchup;
  onPickWinner: (matchupId: string, winner: BracketTeam) => void;
}

function MatchupCard({ matchup, onPickWinner }: MatchupCardProps) {
  const canPick = matchup.team1 !== null && matchup.team2 !== null && matchup.winner === null;

  const renderTeam = (team: BracketTeam | null, slot: 'team1' | 'team2') => {
    const isWinner = matchup.winner?.seed === team?.seed && matchup.winner?.name === team?.name;
    if (!team) {
      return (
        <div className="flex items-center gap-2 py-1.5 px-2 rounded opacity-40">
          <span className="text-xs text-gray-600 w-5">—</span>
          <span className="text-xs text-gray-600 italic">BYE</span>
        </div>
      );
    }
    return (
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
          isWinner ? 'bg-green-900/40' : ''
        } ${canPick ? 'cursor-pointer hover:bg-gray-700' : ''}`}
        onClick={() => canPick && onPickWinner(matchup.id, team)}
        role={canPick ? 'button' : undefined}
        tabIndex={canPick ? 0 : undefined}
        onKeyDown={(e) => {
          if (canPick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onPickWinner(matchup.id, team);
          }
        }}
      >
        <span className="text-xs text-gray-500 w-5 shrink-0">#{team.seed}</span>
        <span
          className={`text-sm font-medium truncate ${
            isWinner ? 'text-green-400' : 'text-gray-200'
          }`}
        >
          {team.name}
        </span>
        {isWinner && <span className="ml-auto text-green-400 text-xs">W</span>}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="divide-y divide-gray-700">
        {renderTeam(matchup.team1, 'team1')}
        <div className="flex items-center justify-center py-0.5">
          <span className="text-xs text-gray-600">vs</span>
        </div>
        {renderTeam(matchup.team2, 'team2')}
      </div>
      {canPick && (
        <p className="text-xs text-gray-600 text-center pb-1.5 pt-0.5">Click to pick winner</p>
      )}
    </div>
  );
}
