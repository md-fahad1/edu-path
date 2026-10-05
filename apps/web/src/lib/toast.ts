'use client';
import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
export type ToastItem = { id: number; kind: ToastKind; msg: string };

type S = {
  items: ToastItem[];
  push: (kind: ToastKind, msg: string, ms?: number) => void;
  dismiss: (id: number) => void;
};

let seq = 0;

export const useToasts = create<S>((set, get) => ({
  items: [],
  push(kind, msg, ms = 3500) {
    const id = ++seq;
    set((s) => ({ items: [...s.items.slice(-2), { id, kind, msg }] })); // max 3 ta
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
}));

/** Jekono jaygay: toast.success('...') / toast.error('...') */
export const toast = {
  success: (m: string) => useToasts.getState().push('success', m),
  error: (m: string) => useToasts.getState().push('error', m, 5000),
  info: (m: string) => useToasts.getState().push('info', m),
};