export type CoachingRole = 'head-coach' | 'offensive-coordinator' | 'defensive-coordinator' | 'special-teams' | 'position-coach' | 'other';

export interface CoachingStaff {
  id: string;
  dynastyId: string;
  name: string;
  role: CoachingRole;
  hireYear: number;
  fireYear?: number;
  schemeNotes?: string;
  createdAt: number;
  updatedAt: number;
}
