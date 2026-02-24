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
  Rival,
  ScoutingNote,
  Achievement,
} from '@dynasty-os/core-types';
import { SCHEMA, DB_NAME } from './schema';

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
  rivals!: Table<Rival, string>;
  scoutingNotes!: Table<ScoutingNote, string>;
  achievements!: Table<Achievement, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores(SCHEMA);
    this.version(4).stores(SCHEMA);
    this.version(5).stores(SCHEMA);
  }
}

export const db = new DynastyDB();
