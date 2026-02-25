import type { SportConfig, SportType } from '@dynasty-os/core-types';
import { cfbConfig } from './cfb';
import { maddenConfig } from './madden';
import { nfl2kConfig } from './nfl2k';

export const SPORT_CONFIGS_VERSION = '1.0.0';

const configs: Record<SportType, SportConfig> = {
  cfb: cfbConfig,
  madden: maddenConfig,
  nfl2k: nfl2kConfig,
};

export function getSportConfig(sport: SportType): SportConfig {
  const config = configs[sport];
  if (!config) {
    throw new Error(`Unknown sport: ${sport}`);
  }
  return config;
}

export { cfbConfig } from './cfb';
export { maddenConfig } from './madden';
export { nfl2kConfig } from './nfl2k';
