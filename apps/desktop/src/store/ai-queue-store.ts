import { create } from 'zustand';
import { generateId } from '../lib/uuid';

export interface AiJob {
  id: string;
  type: 'legacy-blurb' | 'season-narrative' | 'recruiting-grade' | 'journalist-blurb' | 'hot-seat' | 'dossier' | 'rival-prophecy' | 'obituary' | 'generational-arc' | 'what-if' | 'dna-report' | 'living-chronicle';
  payload: Record<string, unknown>;
  dynastyId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  enqueuedAt: number;
}

interface AiQueueState {
  pendingAiJobs: AiJob[];
}
interface AiQueueActions {
  enqueueAiJob: (job: Omit<AiJob, 'id' | 'status' | 'enqueuedAt'>) => void;
  updateJobStatus: (id: string, status: AiJob['status']) => void;
  clearCompleted: () => void;
}

export const useAiQueueStore = create<AiQueueState & AiQueueActions>((set) => ({
  pendingAiJobs: [],
  enqueueAiJob: (job) =>
    set((state) => ({
      pendingAiJobs: [
        ...state.pendingAiJobs,
        { ...job, id: generateId(), status: 'pending', enqueuedAt: Date.now() },
      ],
    })),
  updateJobStatus: (id, status) =>
    set((state) => ({
      pendingAiJobs: state.pendingAiJobs.map((j) =>
        j.id === id ? { ...j, status } : j
      ),
    })),
  clearCompleted: () =>
    set((state) => ({
      pendingAiJobs: state.pendingAiJobs.filter(
        (j) => j.status !== 'done' && j.status !== 'failed'
      ),
    })),
}));
