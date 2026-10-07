'use client';
import { create } from 'zustand';

export type User = { id: string; name: string; email: string | null; phone: string | null; role: 'STUDENT' | 'TEACHER' | 'ADMIN' };

type AuthState = {
  token: string | null;
  user: User | null;
  ready: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<boolean>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (d: { name: string; email?: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

// শেষ লগইন করা ইউজারের (গোপন নয়) তথ্য ব্রাউজারে রাখি, যাতে পেজ খুলতেই UI দেখানো যায়
const KEY = 'sp_user';
function saveUser(u: User) { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {} }
function clearUser() { try { localStorage.removeItem(KEY); } catch {} }
function readUser(): User | null {
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as User) : null; } catch { return null; }
}

let refreshing: Promise<boolean> | null = null;

async function post(path: string, body?: unknown) {
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST', credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Something went wrong') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null, user: null, ready: false,
  async refresh() {
    if (!refreshing) {
      refreshing = post('/auth/refresh')
        .then((d) => { set({ token: d.accessToken, user: d.user }); saveUser(d.user); return true; })
        .catch((e: Error & { status?: number }) => {
          // শুধু সেশন সত্যিই অবৈধ (401) হলে লগআউট। নেটওয়ার্ক/সার্ভার ধীর হলে ইউজারকে বের করি না
          if (e.status === 401) { set({ token: null, user: null }); clearUser(); }
          return false;
        })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  },
  async init() {
    if (get().ready) return;
    const cached = readUser();
    if (!cached) { set({ ready: true }); return; } // লগইন করা ছিল না: নেটওয়ার্ক কলই লাগবে না
    set({ user: cached, ready: true });            // সাথে সাথে UI দেখাই
    await get().refresh();                          // পেছনে নতুন token আনি
  },
  async login(identifier, password) {
    const d = await post('/auth/login', { identifier, password });
    set({ token: d.accessToken, user: d.user, ready: true });
    saveUser(d.user);
  },
  async register(body) {
    const d = await post('/auth/register', body);
    set({ token: d.accessToken, user: d.user, ready: true });
    saveUser(d.user);
  },
  async logout() {
    await post('/auth/logout').catch(() => undefined);
    set({ token: null, user: null });
    clearUser();
  },
}));