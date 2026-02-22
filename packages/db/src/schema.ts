export const SCHEMA = {
  dynasties: 'id, sport, createdAt, updatedAt',
  seasons: 'id, dynastyId, year, [dynastyId+year]',
  games: 'id, seasonId, dynastyId, week, [dynastyId+seasonId]',
  players: 'id, dynastyId, position, status, [dynastyId+status]',
  playerSeasons: 'id, playerId, dynastyId, seasonId, year, [playerId+year]',
} as const;

export const DB_NAME = 'dynasty-os-db';
export const DB_VERSION = 2;
