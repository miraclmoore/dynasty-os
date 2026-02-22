import { create } from 'zustand';
import type { RecruitingClass, Recruit } from '@dynasty-os/core-types';
import {
  createRecruitingClass,
  getRecruitingClassesByDynasty,
  deleteRecruitingClass,
  getRecruitsByClass,
  addRecruit as svcAddRecruit,
  deleteRecruit as svcDeleteRecruit,
  generateClassGrade,
} from '../lib/recruiting-service';

interface RecruitingState {
  classes: RecruitingClass[];
  recruitsForClass: Recruit[];
  activeClass: RecruitingClass | null;
  loading: boolean;
  error: string | null;
}

interface RecruitingActions {
  loadClasses: (dynastyId: string) => Promise<void>;
  loadRecruitsForClass: (classId: string) => Promise<void>;
  createClass: (input: Omit<RecruitingClass, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RecruitingClass>;
  deleteClass: (id: string, dynastyId: string) => Promise<void>;
  addRecruit: (input: Omit<Recruit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeRecruit: (id: string, classId: string) => Promise<void>;
  generateGrade: (classId: string, dynastyId: string) => Promise<void>;
  setActiveClass: (recruitingClass: RecruitingClass | null) => void;
  clearError: () => void;
}

type RecruitingStore = RecruitingState & RecruitingActions;

export const useRecruitingStore = create<RecruitingStore>((set, get) => ({
  classes: [],
  recruitsForClass: [],
  activeClass: null,
  loading: false,
  error: null,

  loadClasses: async (dynastyId: string) => {
    set({ loading: true, error: null });
    try {
      const classes = await getRecruitingClassesByDynasty(dynastyId);
      set({ classes, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  loadRecruitsForClass: async (classId: string) => {
    set({ loading: true, error: null });
    try {
      const recruitsForClass = await getRecruitsByClass(classId);
      const { classes } = get();
      const activeClass = classes.find((c) => c.id === classId) ?? null;
      set({ recruitsForClass, activeClass, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  createClass: async (input: Omit<RecruitingClass, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      const newClass = await createRecruitingClass(input);
      const classes = await getRecruitingClassesByDynasty(input.dynastyId);
      set({ classes, loading: false });
      return newClass;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  deleteClass: async (id: string, dynastyId: string) => {
    set({ loading: true, error: null });
    try {
      await deleteRecruitingClass(id);
      const classes = await getRecruitingClassesByDynasty(dynastyId);
      const { activeClass } = get();
      set({
        classes,
        loading: false,
        activeClass: activeClass?.id === id ? null : activeClass,
        recruitsForClass: get().activeClass?.id === id ? [] : get().recruitsForClass,
      });
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  addRecruit: async (input: Omit<Recruit, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      await svcAddRecruit(input);
      const recruitsForClass = await getRecruitsByClass(input.classId);
      set({ recruitsForClass, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  removeRecruit: async (id: string, classId: string) => {
    set({ loading: true, error: null });
    try {
      await svcDeleteRecruit(id);
      const recruitsForClass = await getRecruitsByClass(classId);
      set({ recruitsForClass, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  generateGrade: async (classId: string, dynastyId: string) => {
    set({ loading: true, error: null });
    try {
      await generateClassGrade(classId);
      // Refresh classes to pick up the updated aiGrade on the class
      const classes = await getRecruitingClassesByDynasty(dynastyId);
      const { activeClass } = get();
      // Update activeClass in state if it's the one that just got graded
      const updatedActiveClass = activeClass?.id === classId
        ? (classes.find((c) => c.id === classId) ?? activeClass)
        : activeClass;
      set({ classes, activeClass: updatedActiveClass, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  setActiveClass: (recruitingClass: RecruitingClass | null) => {
    set({ activeClass: recruitingClass });
  },

  clearError: () => set({ error: null }),
}));
