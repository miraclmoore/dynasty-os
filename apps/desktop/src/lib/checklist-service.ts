import { db } from '@dynasty-os/db';

export type ChecklistTaskId =
  | 'log-games'
  | 'season-end'
  | 'narrative'
  | 'player-stats'
  | 'recruiting'
  | 'nfl-draft'
  | 'transfer-portal';

export interface ChecklistTask {
  id: ChecklistTaskId;
  label: string;
  description: string;
  navigateTo: string;
  cfbOnly?: true;
}

export const CHECKLIST_TASKS: ChecklistTask[] = [
  {
    id: 'log-games',
    label: 'Log all games for the season',
    description: 'Record every game result, score, week, and opponent for the season',
    navigateTo: 'dashboard',
  },
  {
    id: 'season-end',
    label: 'Record season end data (bowl/playoff/ranking)',
    description: 'Set your final ranking, bowl game result, or playoff finish',
    navigateTo: 'dashboard',
  },
  {
    id: 'narrative',
    label: 'Generate season recap narrative',
    description: 'Use Claude AI to write a 2-3 paragraph season story (requires API key)',
    navigateTo: 'season-recap',
  },
  {
    id: 'player-stats',
    label: 'Update player stats for the season',
    description: "Enter each player's stats for the season on their profile page",
    navigateTo: 'roster',
  },
  {
    id: 'recruiting',
    label: 'Log recruiting class (CFB)',
    description: 'Add your incoming recruits, class rank, and star ratings',
    navigateTo: 'recruiting',
    cfbOnly: true,
  },
  {
    id: 'nfl-draft',
    label: 'Log NFL draft class (CFB)',
    description: 'Record which players were drafted and their round/team',
    navigateTo: 'draft-tracker',
    cfbOnly: true,
  },
  {
    id: 'transfer-portal',
    label: 'Log transfer portal activity (CFB)',
    description: 'Track incoming and outgoing players via the portal',
    navigateTo: 'transfer-portal',
    cfbOnly: true,
  },
];

async function verifyTask(
  taskId: ChecklistTaskId,
  dynastyId: string,
  seasonId: string
): Promise<boolean> {
  try {
    switch (taskId) {
      case 'log-games': {
        const count = await db.games.where('seasonId').equals(seasonId).count();
        return count > 0;
      }
      case 'season-end': {
        const season = await db.seasons.get(seasonId);
        if (!season) return false;
        return (
          season.finalRanking != null ||
          season.bowlResult != null ||
          season.playoffResult != null
        );
      }
      case 'narrative': {
        const entry = await db.aiCache
          .where('[dynastyId+contentType]')
          .equals([dynastyId, 'season-narrative'])
          .filter((e) => e.cacheKey.includes(seasonId))
          .first();
        return !!entry;
      }
      case 'player-stats': {
        const count = await db.playerSeasons
          .where('seasonId')
          .equals(seasonId)
          .filter((ps) => Object.keys(ps.stats).length > 0)
          .count();
        return count > 0;
      }
      case 'recruiting': {
        const count = await db.recruitingClasses
          .where('seasonId')
          .equals(seasonId)
          .count();
        return count > 0;
      }
      case 'nfl-draft': {
        const count = await db.draftPicks.where('seasonId').equals(seasonId).count();
        return count > 0;
      }
      case 'transfer-portal': {
        const count = await db.transferPortalEntries
          .where('seasonId')
          .equals(seasonId)
          .count();
        return count > 0;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export async function verifyAllTasks(
  dynastyId: string,
  seasonId: string,
  tasks: ChecklistTask[]
): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    tasks.map(async (task) => {
      const verified = await verifyTask(task.id, dynastyId, seasonId);
      return [task.id, verified] as const;
    })
  );
  return Object.fromEntries(results);
}
