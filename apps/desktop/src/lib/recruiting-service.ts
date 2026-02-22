import { db } from '@dynasty-os/db';
import type { RecruitingClass, Recruit } from '@dynasty-os/core-types';
import { generateId } from './uuid';
import { getApiKey } from './legacy-card-service';

// ── Recruiting Class CRUD ─────────────────────────────────────────────────────

export async function createRecruitingClass(
  input: Omit<RecruitingClass, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RecruitingClass> {
  const now = Date.now();
  const recruitingClass: RecruitingClass = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.recruitingClasses.add(recruitingClass);
  return recruitingClass;
}

export async function getRecruitingClassesByDynasty(
  dynastyId: string
): Promise<RecruitingClass[]> {
  const classes = await db.recruitingClasses
    .where('dynastyId')
    .equals(dynastyId)
    .toArray();
  return classes.sort((a, b) => b.year - a.year);
}

export async function getRecruitingClass(
  id: string
): Promise<RecruitingClass | undefined> {
  return db.recruitingClasses.get(id);
}

export async function updateRecruitingClass(
  id: string,
  updates: Partial<Omit<RecruitingClass, 'id' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.recruitingClasses.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteRecruitingClass(id: string): Promise<void> {
  // Cascade-delete all recruits for this class first
  await db.recruits.where('classId').equals(id).delete();
  await db.recruitingClasses.delete(id);
}

// ── Recruit CRUD ──────────────────────────────────────────────────────────────

export async function addRecruit(
  input: Omit<Recruit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Recruit> {
  const now = Date.now();
  const recruit: Recruit = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.recruits.add(recruit);
  return recruit;
}

export async function getRecruitsByClass(classId: string): Promise<Recruit[]> {
  return db.recruits.where('classId').equals(classId).toArray();
}

export async function deleteRecruit(id: string): Promise<void> {
  await db.recruits.delete(id);
}

// ── AI Grade Generation ───────────────────────────────────────────────────────

interface GradeResult {
  aiGrade: string;
  aiAnalysis: string;
}

/**
 * Calls Claude Haiku to generate a letter grade and analysis for a recruiting class.
 * Returns null if no API key or if the call fails for any reason.
 * Never throws — the grade is optional enhancement, not critical path.
 */
export async function generateClassGrade(classId: string): Promise<GradeResult | null> {
  try {
    const recruitingClass = await getRecruitingClass(classId);
    if (!recruitingClass) {
      console.warn('[Recruiting] Class not found:', classId);
      return null;
    }

    const recruits = await getRecruitsByClass(classId);

    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('[Recruiting] No API key configured');
      return null;
    }

    // Build position groups list
    const positions = [...new Set(recruits.map((r) => r.position))];

    // Top recruits: up to 5, sorted by stars desc then nationalRank asc (nulls last)
    const topRecruits = [...recruits]
      .sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        const aRank = a.nationalRank ?? Infinity;
        const bRank = b.nationalRank ?? Infinity;
        return aRank - bRank;
      })
      .slice(0, 5);

    const topRecruitsText = topRecruits
      .map((r) => {
        const rankStr = r.nationalRank != null ? ` - #${r.nationalRank}` : '';
        return `${r.name} - ${r.position} - ${r.stars}-star${rankStr}`;
      })
      .join('\n');

    const userMessage =
      `Class Rank: #${recruitingClass.classRank}\n` +
      `Total Commits: ${recruitingClass.totalCommits}\n` +
      `Star Breakdown: ${recruitingClass.fiveStars} five-star, ${recruitingClass.fourStars} four-star, ${recruitingClass.threeStars} three-star\n` +
      `Position Groups Recruited: ${positions.join(', ') || 'None recorded'}\n` +
      `Top Recruits:\n${topRecruitsText || 'None recorded'}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:
          'You are a college football recruiting analyst. Evaluate this recruiting class and provide a letter grade and brief analysis. Respond with exactly this format:\nGRADE: [A+/A/A-/B+/B/B-/C+/C/C-/D+/D/D-/F]\nANALYSIS: [2-3 sentences analyzing the class strengths, weaknesses, and position needs addressed]',
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[Recruiting] Claude API returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data?.content?.[0]?.text;
    if (!text) {
      console.warn('[Recruiting] Claude API response missing text content');
      return null;
    }

    const gradeMatch = text.match(/^GRADE:\s*(.+)$/m);
    const analysisMatch = text.match(/^ANALYSIS:\s*([\s\S]+)$/m);

    if (!gradeMatch || !analysisMatch) {
      console.warn('[Recruiting] Could not parse grade/analysis from response:', text);
      return null;
    }

    const aiGrade = gradeMatch[1].trim();
    const aiAnalysis = analysisMatch[1].trim();

    // Persist the grade back to the class record
    await db.recruitingClasses.update(classId, {
      aiGrade,
      aiAnalysis,
      aiGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { aiGrade, aiAnalysis };
  } catch (err) {
    console.warn('[Recruiting] generateClassGrade failed:', err);
    return null;
  }
}
