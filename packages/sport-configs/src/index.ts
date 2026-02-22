import type { SportConfig, SportType } from '@dynasty-os/core-types';
import { cfbConfig } from './cfb';
import { maddenConfig } from './madden';

export const SPORT_CONFIGS_VERSION = '1.0.0';

const configs: Record<SportType, SportConfig> = {
  cfb: cfbConfig,
  madden: maddenConfig,
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
