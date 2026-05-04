/**
 * CFB 26 deal breaker / motivation categories.
 * These are the exact strings used in EA Sports CFB 26 and are stored verbatim
 * in the Recruit.motivation1/2/3 and Recruit.dealBreakerMotivation fields.
 *
 * Also re-exported from here for use in Player.dealBreaker (DMOD-04).
 */
export const CFB_DEAL_BREAKER_CATEGORIES: readonly string[] = [
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

/** Dev trait display labels for Player.devTrait. */
export const DEV_TRAITS: readonly string[] = [
  'normal',
  'star',
  'superstar',
  'xfactor',
] as const;

export const DEV_TRAIT_LABEL: Record<string, string> = {
  normal: 'Normal',
  star: 'Star',
  superstar: 'Superstar',
  xfactor: 'X-Factor',
};

/**
 * Tailwind class string for dev trait badge backgrounds/text/borders.
 * Returns empty string for unknown traits.
 */
export function DEV_TRAIT_BADGE(trait: string): string {
  switch (trait) {
    case 'normal':
      return 'bg-gray-700/60 text-gray-300 border-gray-600';
    case 'star':
      return 'bg-blue-900/40 text-blue-300 border-blue-700';
    case 'superstar':
      return 'bg-purple-900/40 text-purple-300 border-purple-700';
    case 'xfactor':
      return 'bg-yellow-900/40 text-yellow-300 border-yellow-600';
    default:
      return 'bg-gray-700/60 text-gray-300 border-gray-600';
  }
}
