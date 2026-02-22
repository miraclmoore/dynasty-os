import Dexie, { type Table } from 'dexie';
import type { Dynasty, Season, Game, Player, PlayerSeason } from '@dynasty-os/core-types';
import { SCHEMA, DB_NAME, DB_VERSION } from './schema';

export class DynastyDB extends Dexie {
  dynasties!: Table<Dynasty, string>;
  seasons!: Table<Season, string>;
  games!: Table<Game, string>;
  players!: Table<Player, string>;
  playerSeasons!: Table<PlayerSeason, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores(SCHEMA);
  }
}

export const db = new DynastyDB();
