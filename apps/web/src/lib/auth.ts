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

let refreshing: Promise<boolean> | null = null;

async function post(path: string, body?: unknown) {
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST', credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Something went wrong');
  return data;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null, user: null, ready: false,
  async refresh() {
    if (!refreshing) {
      refreshing = post('/auth/refresh')
        .then((d) => { set({ token: d.accessToken, user: d.user }); return true; })
        .catch(() => { set({ token: null, user: null }); return false; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  },
  async init() {
    if (get().ready) return;
    // refresh cookie thakle silently login restore
    await get().refresh();
    set({ ready: true });
  },
  async login(identifier, password) {
    const d = await post('/auth/login', { identifier, password });
    set({ token: d.accessToken, user: d.user, ready: true });
  },
  async register(body) {
    const d = await post('/auth/register', body);
    set({ token: d.accessToken, user: d.user, ready: true });
  },
  async logout() {
    await post('/auth/logout').catch(() => undefined);
    set({ token: null, user: null });
  },
}));
