import { createHash, randomBytes } from 'crypto';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 48) => randomBytes(bytes).toString('hex');

/** ASCII-only stable slug. Bangla text theke latin word nei, tai short random suffix dei. */
export function slugify(text: string, prefix = 'mcq'): string {
  const words = (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, 6).join('-');
  const suffix = randomBytes(4).toString('hex');
  return [prefix, words, suffix].filter(Boolean).join('-').slice(0, 80);
}

export function slugifyName(text: string): string {
  const s = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || randomBytes(3).toString('hex');
}

// Deterministic shuffle (seed = attemptId) - same attempt always gets same order
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rnd = mulberry32(xmur3(seed)());
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const todayDate = () => new Date(new Date().toISOString().slice(0, 10));
