import { create } from 'zustand';
import { toast } from 'sonner';

interface ToastActions {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string) => void;
  loading: (message: string) => string | number;
  dismiss: (id?: string | number) => void;
}

export const useToastStore = create<ToastActions>(() => ({
  success: (message, description) => toast.success(message, { description }),
  error: (message, description) => toast.error(message, { description }),
  info: (message) => toast(message),
  loading: (message) => toast.loading(message),
  dismiss: (id) => toast.dismiss(id),
}));
