'use client';
import { create } from 'zustand';

export type TQuestion = { id: string; text: string; options: { id: string; text: string }[] };
export type Attempt = {
  attemptId: string; status: string; deadline: string; serverNow: string; durationSec: number;
  test: { id: string; title: string; slug: string; negativeMark: number; markPerQ: number };
  questions: TQuestion[]; answers: Record<string, string | null>;
};

type S = {
  attemptId: string | null;
  index: number;
  answers: Record<string, string | null>;
  marked: Record<string, boolean>;
  pending: Record<string, string | null>; // server-e ekhono save hoy nai (offline/fail)
  deadlineMs: number; // client clock-e deadline (server skew adjust kora)
  load: (a: Attempt) => void;
  go: (i: number) => void;
  answer: (qid: string, oid: string | null) => void;
  toggleMark: (qid: string) => void;
  clearPending: (qid: string, oid: string | null) => void;
  reset: () => void;
};

const key = (id: string) => `edu-attempt-${id}`;
const persist = (s: S) => {
  if (!s.attemptId) return;
  try { localStorage.setItem(key(s.attemptId), JSON.stringify({ answers: s.answers, marked: s.marked, pending: s.pending, index: s.index })); } catch {}
};

export const useTest = create<S>((set, get) => ({
  attemptId: null, index: 0, answers: {}, marked: {}, pending: {}, deadlineMs: 0,
  load(a) {
    let local: any = null;
    try { local = JSON.parse(localStorage.getItem(key(a.attemptId)) || 'null'); } catch {}
    const skew = new Date(a.serverNow).getTime() - Date.now();
    set({
      attemptId: a.attemptId, deadlineMs: new Date(a.deadline).getTime() - skew,
      // server answer-ei source of truth, local pending upor overlay hoy
      answers: { ...a.answers, ...(local?.pending ?? {}) }, pending: local?.pending ?? {}, marked: local?.marked ?? {}, index: Math.min(local?.index ?? 0, a.questions.length - 1),
    });
  },
  go(i) { set({ index: i }); persist(get()); },
  answer(qid, oid) { set((s) => ({ answers: { ...s.answers, [qid]: oid }, pending: { ...s.pending, [qid]: oid } })); persist(get()); },
  toggleMark(qid) { set((s) => ({ marked: { ...s.marked, [qid]: !s.marked[qid] } })); persist(get()); },
  clearPending(qid, oid) {
    set((s) => {
      if (s.pending[qid] !== oid) return s; // user ইতিমধ্যে অন্য option নিয়েছে
      const { [qid]: _, ...rest } = s.pending;
      return { pending: rest };
    });
    persist(get());
  },
  reset() {
    const id = get().attemptId;
    if (id) try { localStorage.removeItem(key(id)); } catch {}
    set({ attemptId: null, index: 0, answers: {}, marked: {}, pending: {}, deadlineMs: 0 });
  },
}));
