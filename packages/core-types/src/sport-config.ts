import type { SportType } from './dynasty';
import type { GameType } from './game';

export interface TeamInfo {
  name: string;
  abbreviation: string;
  conference: string;
  mascot?: string;
}

export interface Conference {
  name: string;
  teams: string[];
}

export interface StatCategory {
  key: string;
  label: string;
  group: string;
  type: 'integer' | 'decimal';
}

export interface SportConfig {
  sport: SportType;
  label: string;
  teams: TeamInfo[];
  conferences: Conference[];
  positions: string[];
  statCategories: StatCategory[];
  gameTypes: GameType[];
  rankingSystems?: string[];
  classYears?: string[];
  gameVersions: string[];
}
