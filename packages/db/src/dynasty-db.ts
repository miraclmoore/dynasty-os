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
  CoachingStaff,
  NilEntry,
  FutureGame,
  PlayerLink,
  AiCacheEntry,
} from '@dynasty-os/core-types';
import { SCHEMA, SCHEMA_V6, DB_NAME } from './schema';

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
  coachingStaff!: Table<CoachingStaff, string>;
  nilEntries!: Table<NilEntry, string>;
  futureGames!: Table<FutureGame, string>;
  playerLinks!: Table<PlayerLink, string>;
  aiCache!: Table<AiCacheEntry, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores(SCHEMA);
    this.version(4).stores(SCHEMA);
    this.version(5).stores(SCHEMA);
    this.version(6).stores(SCHEMA_V6);
    this.on('versionchange', () => { this.close(); window.location.reload(); });
  }
}

export const db = new DynastyDB();
