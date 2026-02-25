import { create } from 'zustand';
import { toast } from 'sonner';
import type { CoachingStaff, CoachingRole } from '@dynasty-os/core-types';
import {
  createCoach,
  getCoachingStaffByDynasty,
  fireCoach as svcFireCoach,
  updateCoach,
  deleteCoach,
} from '../lib/coaching-staff-service';
import { useToastStore } from './toast-store';
import { useUndoStore, type UndoableOperation } from './undo-store';

interface CoachingStaffState {
  staff: CoachingStaff[];
  loading: boolean;
}

interface CoachingStaffActions {
  loadStaff: (dynastyId: string) => Promise<void>;
  addCoach: (
    input: Omit<CoachingStaff, 'id' | 'createdAt' | 'updatedAt'>,
    dynastyId: string
  ) => Promise<void>;
  removeCoach: (id: string, dynastyId: string) => Promise<void>;
  fireCoach: (id: string, fireYear: number, dynastyId: string) => Promise<void>;
  promoteCoach: (id: string, newRole: CoachingRole, dynastyId: string) => Promise<void>;
}

type CoachingStaffStore = CoachingStaffState & CoachingStaffActions;

export const useCoachingStaffStore = create<CoachingStaffStore>((set, get) => ({
  staff: [],
  loading: false,

  loadStaff: async (dynastyId: string) => {
    set({ loading: true });
    try {
      const staff = await getCoachingStaffByDynasty(dynastyId);
      set({ staff, loading: false });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to load coaching staff', String(err));
    }
  },

  addCoach: async (input, dynastyId) => {
    set({ loading: true });
    try {
      await createCoach(input);
      const staff = await getCoachingStaffByDynasty(dynastyId);
      set({ staff, loading: false });
      useToastStore.getState().success('Coach hired', input.name);
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to hire coach', String(err));
    }
  },

  removeCoach: async (id, dynastyId) => {
    set({ loading: true });
    try {
      const { staff } = get();
      const existing = staff.find((c) => c.id === id);
      if (existing) {
        const op: UndoableOperation = {
          id: crypto.randomUUID(),
          table: 'coachingStaff',
          operation: 'delete',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Delete coach ${existing.name}`,
          performedAt: Date.now(),
        };
        useUndoStore.getState().pushUndo(op);
      }
      await deleteCoach(id);
      const updated = await getCoachingStaffByDynasty(dynastyId);
      set({ staff: updated, loading: false });
      toast.success('Coach removed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await useUndoStore.getState().undo();
            await useCoachingStaffStore.getState().loadStaff(dynastyId);
            toast.success('Coach restored');
          },
        },
      });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to remove coach', String(err));
    }
  },

  fireCoach: async (id, fireYear, dynastyId) => {
    set({ loading: true });
    try {
      const { staff } = get();
      const existing = staff.find((c) => c.id === id);
      if (existing) {
        const op: UndoableOperation = {
          id: crypto.randomUUID(),
          table: 'coachingStaff',
          operation: 'update',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Fire coach ${existing.name}`,
          performedAt: Date.now(),
        };
        useUndoStore.getState().pushUndo(op);
      }
      await svcFireCoach(id, fireYear);
      const updated = await getCoachingStaffByDynasty(dynastyId);
      set({ staff: updated, loading: false });
      const coachName = existing?.name ?? 'Coach';
      toast.success(`${coachName} fired`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await useUndoStore.getState().undo();
            await useCoachingStaffStore.getState().loadStaff(dynastyId);
            toast.success('Fire undone');
          },
        },
      });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to fire coach', String(err));
    }
  },

  promoteCoach: async (id, newRole, dynastyId) => {
    set({ loading: true });
    try {
      await updateCoach(id, { role: newRole });
      const updated = await getCoachingStaffByDynasty(dynastyId);
      set({ staff: updated, loading: false });
      useToastStore.getState().success('Coach promoted');
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to promote coach', String(err));
    }
  },
}));
