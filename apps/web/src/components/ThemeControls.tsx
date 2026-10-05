'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';
type Size = 'sm' | 'md' | 'lg';

const THEME_KEYS = ['light', 'dark', 'system'] as const;
const SIZE_KEYS = ['sm', 'md', 'lg'] as const;

const THEMES: { v: Theme; label: string }[] = [
  { v: 'light', label: '☀️ আলো' },
  { v: 'dark', label: '🌙 অন্ধকার' },
  { v: 'system', label: '💻 অটো' },
];
const SIZES: { v: Size; label: string; cls: string }[] = [
  { v: 'sm', label: 'ছোট', cls: 'text-xs' },
  { v: 'md', label: 'মাঝারি', cls: 'text-base' },
  { v: 'lg', label: 'বড়', cls: 'text-xl' },
];

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'system' && mq().matches));
}
function applySize(s: Size) {
  if (s === 'md') document.documentElement.removeAttribute('data-fs');
  else document.documentElement.setAttribute('data-fs', s);
}
function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch { return fallback; }
}
function save(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch {}
}

export function ThemeControls() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [size, setSize] = useState<Size>('md');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(load('theme', THEME_KEYS, 'system'));
    setSize(load('fs', SIZE_KEYS, 'md'));
  }, []);

  // "অটো" thakle phone/PC-r setting bodlale shathe shathe bodlay
  useEffect(() => {
    if (theme !== 'system') return;
    const m = mq();
    const h = () => applyTheme('system');
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const pickTheme = (t: Theme) => { setTheme(t); save('theme', t); applyTheme(t); };
  const pickSize = (s: Size) => { setSize(s); save('fs', s); applySize(s); };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100"
        aria-label="থিম ও লেখার আকার"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="mb-2 text-sm font-semibold text-slate-900">থিম</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.v} type="button" onClick={() => pickTheme(t.v)} aria-pressed={theme === t.v}
                className={cn('rounded-lg border px-2 py-2 text-sm', theme === t.v ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
              >{t.label}</button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-slate-900">লেখার আকার</p>
          <div className="grid grid-cols-3 gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.v} type="button" onClick={() => pickSize(s.v)} aria-pressed={size === s.v}
                className={cn('rounded-lg border px-2 py-2', s.cls, size === s.v ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
              >{s.label}</button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">রাতে পড়লে “অন্ধকার” থিম চোখের জন্য আরামদায়ক।</p>
        </div>
      )}
    </div>
  );
}