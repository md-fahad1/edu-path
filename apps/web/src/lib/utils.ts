export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const SITE_NAME = 'শিক্ষাপথ';
const BN = '০১২৩৪৫৬৭৮৯';
export const bn = (n: number | string) => String(n).replace(/\d/g, (d) => BN[+d]);
export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
export const LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
export const DIFF_BN: Record<string, string> = { EASY: 'সহজ', MEDIUM: 'মাঝারি', HARD: 'কঠিন' };
