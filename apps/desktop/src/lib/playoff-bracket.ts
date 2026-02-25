export type BracketSize = 4 | 8 | 12;

export interface BracketTeam {
  seed: number;
  name: string;
}

export interface BracketMatchup {
  id: string;
  team1: BracketTeam | null;
  team2: BracketTeam | null;
  winner: BracketTeam | null;
  round: number;
}

export interface Bracket {
  size: BracketSize;
  rounds: BracketMatchup[][];
  champion: BracketTeam | null;
}

/**
 * Build a bracket from a list of teams.
 * teams.length must be 4, 8, or 12.
 *
 * Seeding: highest seed (1) vs lowest seed, 2 vs second-lowest, etc.
 * For 12-team: seeds 1-4 get first-round byes (they enter at round 2).
 *   Round 1: seeds 5-12 play (4 matchups)
 *   Round 2 (quarterfinals): winners vs seeds 1-4
 *   Round 3 (semifinals): 2 matchups
 *   Round 4 (final): 1 matchup
 */
export function buildBracket(teams: BracketTeam[]): Bracket {
  const size = teams.length as BracketSize;
  if (size !== 4 && size !== 8 && size !== 12) {
    throw new Error(`Invalid bracket size: ${teams.length}. Must be 4, 8, or 12.`);
  }

  // Sort teams by seed ascending (seed 1 first)
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);

  if (size === 4) {
    // Round 1: (1 vs 4), (2 vs 3)
    // Round 2: final
    const round1: BracketMatchup[] = [
      { id: 'r1-m0', team1: sorted[0], team2: sorted[3], winner: null, round: 1 },
      { id: 'r1-m1', team1: sorted[1], team2: sorted[2], winner: null, round: 1 },
    ];
    const round2: BracketMatchup[] = [
      { id: 'r2-m0', team1: null, team2: null, winner: null, round: 2 },
    ];
    return { size, rounds: [round1, round2], champion: null };
  }

  if (size === 8) {
    // Round 1: (1v8), (2v7), (3v6), (4v5)
    // Round 2: winners of (0v1) vs winners of (2v3)
    // Round 3: final
    const round1: BracketMatchup[] = [
      { id: 'r1-m0', team1: sorted[0], team2: sorted[7], winner: null, round: 1 },
      { id: 'r1-m1', team1: sorted[1], team2: sorted[6], winner: null, round: 1 },
      { id: 'r1-m2', team1: sorted[2], team2: sorted[5], winner: null, round: 1 },
      { id: 'r1-m3', team1: sorted[3], team2: sorted[4], winner: null, round: 1 },
    ];
    const round2: BracketMatchup[] = [
      { id: 'r2-m0', team1: null, team2: null, winner: null, round: 2 },
      { id: 'r2-m1', team1: null, team2: null, winner: null, round: 2 },
    ];
    const round3: BracketMatchup[] = [
      { id: 'r3-m0', team1: null, team2: null, winner: null, round: 3 },
    ];
    return { size, rounds: [round1, round2, round3], champion: null };
  }

  // 12-team bracket
  // Seeds 1-4 get byes into quarterfinals
  // Round 1 (first round): 5v12, 6v11, 7v10, 8v9
  // Round 2 (quarterfinals): winners vs seeds 1-4
  //   QF0: seed1 vs winner(8v9)
  //   QF1: seed2 vs winner(7v10)
  //   QF2: seed3 vs winner(6v11)
  //   QF3: seed4 vs winner(5v12)
  // Round 3 (semifinals): QF0winner vs QF1winner, QF2winner vs QF3winner
  // Round 4 (final)
  const byeSeeds = sorted.slice(0, 4); // seeds 1-4
  const playInSeeds = sorted.slice(4);  // seeds 5-12

  // Play-in matchups: highest vs lowest of the play-in group
  const round1: BracketMatchup[] = [
    { id: 'r1-m0', team1: playInSeeds[0], team2: playInSeeds[7], winner: null, round: 1 }, // 5 vs 12
    { id: 'r1-m1', team1: playInSeeds[1], team2: playInSeeds[6], winner: null, round: 1 }, // 6 vs 11
    { id: 'r1-m2', team1: playInSeeds[2], team2: playInSeeds[5], winner: null, round: 1 }, // 7 vs 10
    { id: 'r1-m3', team1: playInSeeds[3], team2: playInSeeds[4], winner: null, round: 1 }, // 8 vs 9
  ];

  // Quarterfinals: bye seeds (1-4) wait for play-in winners
  // QF0: seed1 vs winner(8v9=r1-m3), QF1: seed2 vs winner(7v10=r1-m2)
  // QF2: seed3 vs winner(6v11=r1-m1), QF3: seed4 vs winner(5v12=r1-m0)
  const round2: BracketMatchup[] = [
    { id: 'r2-m0', team1: byeSeeds[0], team2: null, winner: null, round: 2 }, // seed1 vs winner r1-m3
    { id: 'r2-m1', team1: byeSeeds[1], team2: null, winner: null, round: 2 }, // seed2 vs winner r1-m2
    { id: 'r2-m2', team1: byeSeeds[2], team2: null, winner: null, round: 2 }, // seed3 vs winner r1-m1
    { id: 'r2-m3', team1: byeSeeds[3], team2: null, winner: null, round: 2 }, // seed4 vs winner r1-m0
  ];

  const round3: BracketMatchup[] = [
    { id: 'r3-m0', team1: null, team2: null, winner: null, round: 3 },
    { id: 'r3-m1', team1: null, team2: null, winner: null, round: 3 },
  ];

  const round4: BracketMatchup[] = [
    { id: 'r4-m0', team1: null, team2: null, winner: null, round: 4 },
  ];

  return { size, rounds: [round1, round2, round3, round4], champion: null };
}

/**
 * Pick a winner for a matchup and advance them to the next round.
 * Returns a new Bracket (immutable — never mutates the input).
 *
 * For 12-team brackets, the play-in winner fills the team2 slot
 * of the corresponding quarterfinal matchup.
 *
 * Advancement rule: winner of matchup index M in round R
 * advances to slot M/2 in round R+1.
 * For 12-team round 1 → round 2, the mapping is:
 *   r1-m0 winner → r2-m3.team2 (seed4's opponent)
 *   r1-m1 winner → r2-m2.team2 (seed3's opponent)
 *   r1-m2 winner → r2-m1.team2 (seed2's opponent)
 *   r1-m3 winner → r2-m0.team2 (seed1's opponent)
 */
export function pickWinner(bracket: Bracket, matchupId: string, winner: BracketTeam): Bracket {
  // Deep-clone rounds to preserve immutability
  const newRounds: BracketMatchup[][] = bracket.rounds.map((round) =>
    round.map((m) => ({ ...m }))
  );

  // Find the matchup
  let foundRoundIdx = -1;
  let foundMatchupIdx = -1;
  for (let ri = 0; ri < newRounds.length; ri++) {
    for (let mi = 0; mi < newRounds[ri].length; mi++) {
      if (newRounds[ri][mi].id === matchupId) {
        foundRoundIdx = ri;
        foundMatchupIdx = mi;
      }
    }
  }

  if (foundRoundIdx === -1) {
    return bracket; // matchup not found — return unchanged
  }

  // Set winner
  newRounds[foundRoundIdx][foundMatchupIdx].winner = winner;

  const nextRoundIdx = foundRoundIdx + 1;
  if (nextRoundIdx < newRounds.length) {
    const nextRound = newRounds[nextRoundIdx];

    if (bracket.size === 12 && foundRoundIdx === 0) {
      // Special 12-team round 1 → round 2 advancement
      // Play-in results fill team2 slot of quarterfinal in reverse order
      // r1-m0 winner → r2-m3.team2
      // r1-m1 winner → r2-m2.team2
      // r1-m2 winner → r2-m1.team2
      // r1-m3 winner → r2-m0.team2
      const qfIdx = (round1Length: number) => round1Length - 1 - foundMatchupIdx;
      const targetQfIdx = qfIdx(newRounds[0].length);
      if (targetQfIdx >= 0 && targetQfIdx < nextRound.length) {
        nextRound[targetQfIdx].team2 = winner;
      }
    } else {
      // Standard advancement: winner of matchup M goes to matchup M/2 in next round
      const nextMatchupIdx = Math.floor(foundMatchupIdx / 2);
      if (nextMatchupIdx < nextRound.length) {
        // Determine which slot: even-indexed matchup fills team1, odd fills team2
        if (foundMatchupIdx % 2 === 0) {
          nextRound[nextMatchupIdx].team1 = winner;
        } else {
          nextRound[nextMatchupIdx].team2 = winner;
        }
      }
    }
  }

  // Check for champion: if the last round's only matchup has a winner, set champion
  const finalRound = newRounds[newRounds.length - 1];
  let champion: BracketTeam | null = bracket.champion;
  if (finalRound.length === 1 && finalRound[0].winner !== null) {
    champion = finalRound[0].winner;
  }

  return { ...bracket, rounds: newRounds, champion };
}
