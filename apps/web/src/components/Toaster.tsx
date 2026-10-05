'use client';
import { useToasts } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ICON = { success: '✔', error: '✕', info: 'ℹ' } as const;
const DOT = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-brand-500' } as const;

export function Toaster() {
  const { items, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      {items.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-white/10 bg-[#172033] px-4 py-3 text-[15px] text-white shadow-xl"
        >
          <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white', DOT[t.kind])}>{ICON[t.kind]}</span>
          <span className="flex-1">{t.msg}</span>
          <button type="button" onClick={() => dismiss(t.id)} className="text-white/60 hover:text-white" aria-label="বন্ধ করুন">✕</button>
        </div>
      ))}
    </div>
  );
}