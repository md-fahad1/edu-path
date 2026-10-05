import { useAuth } from './auth';

const SERVER_BASE = `${process.env.API_URL || 'http://localhost:4000'}/api/v1`;
const isServer = typeof window === 'undefined';
export const BASE = isServer ? SERVER_BASE : '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function parse(res: Response) {
  if (res.ok) return res.status === 204 ? null : res.json();
  let body: any = null;
  try { body = await res.json(); } catch {}
  const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message || `Error ${res.status}`;
  throw new ApiError(res.status, msg, body?.code);
}

/** Server component-e public data (ISR cache shoho) */
export async function sapi<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${SERVER_BASE}${path}`, { next: { revalidate } });
  return parse(res);
}

/** sapi + 404 => null (notFound() er jonno) */
export async function sapiOrNull<T>(path: string, revalidate = 300): Promise<T | null> {
  try { return await sapi<T>(path, revalidate); } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** Client-side: access token auto attach + 401-e ekbar refresh */
export async function api<T = any>(path: string, opts: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...init } = opts;
  const run = (token: string | null) =>
    fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  let res = await run(useAuth.getState().token);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const ok = await useAuth.getState().refresh();
    if (ok) res = await run(useAuth.getState().token);
  }
  return parse(res);
}
