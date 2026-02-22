import Dexie, { type Table } from 'dexie';
import type {
  Dynasty,
  Season,
  Game,
  Player,
  PlayerSeason,
  RecruitingClass,
  Recruit,
  TransferPortalEntry,
  DraftPick,
  PrestigeRating,
} from '@dynasty-os/core-types';
import { SCHEMA, DB_NAME, DB_VERSION } from './schema';

export class DynastyDB extends Dexie {
  dynasties!: Table<Dynasty, string>;
  seasons!: Table<Season, string>;
  games!: Table<Game, string>;
  players!: Table<Player, string>;
  playerSeasons!: Table<PlayerSeason, string>;
  recruitingClasses!: Table<RecruitingClass, string>;
  recruits!: Table<Recruit, string>;
  transferPortalEntries!: Table<TransferPortalEntry, string>;
  draftPicks!: Table<DraftPick, string>;
  prestigeRatings!: Table<PrestigeRating, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores(SCHEMA);
    this.version(DB_VERSION).stores(SCHEMA);
  }
}

export const db = new DynastyDB();
