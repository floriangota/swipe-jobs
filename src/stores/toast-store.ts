import { create } from "zustand";

/**
 * Toast store.
 *
 * This is a module-level Zustand store on purpose: toasts are CLIENT-ONLY UI
 * state with no server-provided initial data, so the per-request store-factory
 * pattern (needed for SSR-hydrated stores in later milestones) isn't required
 * here. Triggered imperatively via the `toast` helper below.
 */
export type ToastVariant = "default" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    counter += 1;
    const id = `toast-${counter}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

function push(variant: ToastVariant, { duration = 4000, ...rest }: ToastOptions): string {
  return useToastStore.getState().add({ variant, duration, ...rest });
}

/** Imperative API: `toast.success({ title, description })`. */
export const toast = {
  show: (opts: ToastOptions) => push("default", opts),
  success: (opts: ToastOptions) => push("success", opts),
  error: (opts: ToastOptions) => push("error", opts),
  warning: (opts: ToastOptions) => push("warning", opts),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
