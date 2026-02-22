import { db } from '@dynasty-os/db';
import type { Dynasty, Season, Game, Player, PlayerSeason } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export interface DynastyExport {
  version: 1;
  exportedAt: number;
  dynasty: Dynasty;
  seasons: Season[];
  games: Game[];
  players: Player[];
  playerSeasons: PlayerSeason[];
}

export async function exportDynasty(dynastyId: string): Promise<string> {
  const dynasty = await db.dynasties.get(dynastyId);
  if (!dynasty) {
    throw new Error(`Dynasty not found: ${dynastyId}`);
  }

  const seasons = await db.seasons.where('dynastyId').equals(dynastyId).toArray();
  const seasonIds = seasons.map((s) => s.id);

  const games =
    seasonIds.length > 0
      ? await db.games.where('seasonId').anyOf(seasonIds).toArray()
      : [];

  const players = await db.players.where('dynastyId').equals(dynastyId).toArray();
  const playerIds = players.map((p) => p.id);

  const playerSeasons =
    playerIds.length > 0
      ? await db.playerSeasons.where('playerId').anyOf(playerIds).toArray()
      : [];

  const exportData: DynastyExport = {
    version: 1,
    exportedAt: Date.now(),
    dynasty,
    seasons,
    games,
    players,
    playerSeasons,
  };

  return JSON.stringify(exportData, null, 2);
}

export function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsText(file);
  });
}

function validateExport(data: unknown): data is DynastyExport {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d['version'] !== 1) return false;
  if (typeof d['exportedAt'] !== 'number') return false;
  if (typeof d['dynasty'] !== 'object' || d['dynasty'] === null) return false;
  if (!Array.isArray(d['seasons'])) return false;
  if (!Array.isArray(d['games'])) return false;
  if (!Array.isArray(d['players'])) return false;
  if (!Array.isArray(d['playerSeasons'])) return false;
  const dynasty = d['dynasty'] as Record<string, unknown>;
  if (typeof dynasty['id'] !== 'string') return false;
  if (typeof dynasty['name'] !== 'string') return false;
  if (typeof dynasty['sport'] !== 'string') return false;
  return true;
}

export async function importDynasty(jsonString: string): Promise<Dynasty> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON: could not parse file');
  }

  if (!validateExport(parsed)) {
    throw new Error('Invalid export file: missing required fields or wrong version');
  }

  const data = parsed as DynastyExport;

  // Check if dynasty with this ID already exists; if so, remap all IDs
  const existing = await db.dynasties.get(data.dynasty.id);
  const needsRemap = existing !== undefined;

  if (!needsRemap) {
    // Insert directly with original IDs
    await db.transaction(
      'rw',
      [db.dynasties, db.seasons, db.games, db.players, db.playerSeasons],
      async () => {
        await db.dynasties.add(data.dynasty);
        if (data.seasons.length > 0) await db.seasons.bulkAdd(data.seasons);
        if (data.games.length > 0) await db.games.bulkAdd(data.games);
        if (data.players.length > 0) await db.players.bulkAdd(data.players);
        if (data.playerSeasons.length > 0) await db.playerSeasons.bulkAdd(data.playerSeasons);
      }
    );
    return data.dynasty;
  }

  // Remap all IDs to avoid conflicts
  const now = Date.now();
  const newDynastyId = generateId();

  // Map old season IDs -> new season IDs
  const seasonIdMap = new Map<string, string>();
  data.seasons.forEach((s) => seasonIdMap.set(s.id, generateId()));

  // Map old player IDs -> new player IDs
  const playerIdMap = new Map<string, string>();
  data.players.forEach((p) => playerIdMap.set(p.id, generateId()));

  // Map old playerSeason IDs -> new playerSeason IDs
  const playerSeasonIdMap = new Map<string, string>();
  data.playerSeasons.forEach((ps) => playerSeasonIdMap.set(ps.id, generateId()));

  // Map old game IDs -> new game IDs
  const gameIdMap = new Map<string, string>();
  data.games.forEach((g) => gameIdMap.set(g.id, generateId()));

  const newDynasty: Dynasty = {
    ...data.dynasty,
    id: newDynastyId,
    name: `${data.dynasty.name} (Imported)`,
    createdAt: now,
    updatedAt: now,
  };

  const newSeasons: Season[] = data.seasons.map((s) => ({
    ...s,
    id: seasonIdMap.get(s.id) ?? generateId(),
    dynastyId: newDynastyId,
  }));

  const newGames: Game[] = data.games.map((g) => ({
    ...g,
    id: gameIdMap.get(g.id) ?? generateId(),
    dynastyId: newDynastyId,
    seasonId: seasonIdMap.get(g.seasonId) ?? g.seasonId,
  }));

  const newPlayers: Player[] = data.players.map((p) => ({
    ...p,
    id: playerIdMap.get(p.id) ?? generateId(),
    dynastyId: newDynastyId,
  }));

  const newPlayerSeasons: PlayerSeason[] = data.playerSeasons.map((ps) => ({
    ...ps,
    id: playerSeasonIdMap.get(ps.id) ?? generateId(),
    dynastyId: newDynastyId,
    playerId: playerIdMap.get(ps.playerId) ?? ps.playerId,
    seasonId: seasonIdMap.get(ps.seasonId) ?? ps.seasonId,
  }));

  await db.transaction(
    'rw',
    [db.dynasties, db.seasons, db.games, db.players, db.playerSeasons],
    async () => {
      await db.dynasties.add(newDynasty);
      if (newSeasons.length > 0) await db.seasons.bulkAdd(newSeasons);
      if (newGames.length > 0) await db.games.bulkAdd(newGames);
      if (newPlayers.length > 0) await db.players.bulkAdd(newPlayers);
      if (newPlayerSeasons.length > 0) await db.playerSeasons.bulkAdd(newPlayerSeasons);
    }
  );

  return newDynasty;
}
