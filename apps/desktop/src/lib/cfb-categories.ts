/**
 * The 14 CFB 26 motivation / deal-breaker categories. These exact strings are
 * stored in Player.dealBreaker, Recruit.motivation1/2/3, and
 * Recruit.dealBreakerMotivation. Source: .planning/phases/21-data-model/21-UI-SPEC.md
 *
 * DO NOT REORDER, RENAME, or LOCALIZE — these strings are the storage values
 * and must match exactly between the writer (forms) and any reader (Hard Sell
 * calculator in Phase 24, recruiting screenshot parser in Phase 22).
 */
export const CFB_DEAL_BREAKER_CATEGORIES = [
  'Academics',
  'Campus Lifestyle',
  'Closer to Home',
  'Coach Reputation',
  'Conference Prestige',
  'Distance From Home',
  'Financial Aid',
  'NFL Draft Potential',
  'Playing Time',
  'Program Prestige',
  'Scheme Fit',
  'Stability',
  'Team Culture',
  'Weather',
] as const;

export type CfbDealBreakerCategory = (typeof CFB_DEAL_BREAKER_CATEGORIES)[number];

/**
 * Dev trait values stored on Player.devTrait. The same union is duplicated in
 * @dynasty-os/core-types/src/player.ts (Plan 21-01). Centralized here for UI
 * use (selector options, badge map keys).
 */
export const DEV_TRAITS = ['normal', 'star', 'superstar', 'xfactor'] as const;
export type DevTrait = (typeof DEV_TRAITS)[number];

export const DEV_TRAIT_LABEL: Record<DevTrait, string> = {
  normal: 'Normal',
  star: 'Star',
  superstar: 'Superstar',
  xfactor: 'X-Factor',
};

/**
 * Tailwind class strings for the dev trait badge (from UI-SPEC §Color).
 * Used by RosterPage, PlayerProfilePage, and any future trait-aware UI.
 */
export const DEV_TRAIT_BADGE: Record<DevTrait, string> = {
  normal: 'bg-gray-700/60 text-gray-300 border-gray-600',
  star: 'bg-blue-900/40 text-blue-300 border-blue-700',
  superstar: 'bg-purple-900/40 text-purple-300 border-purple-700',
  xfactor: 'bg-yellow-900/40 text-yellow-300 border-yellow-600',
};
