import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg' };
const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-200',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:opacity-50',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-[15px]', lg: 'px-6 py-3 text-base' };
export const btnClass = (variant: keyof typeof variants = 'primary', size: keyof typeof sizes = 'md', extra?: string) =>
  cn('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed select-none', variants[variant], sizes[size], extra);

export function Button({ variant = 'primary', size = 'md', className, ...p }: BtnProps) {
  return <button {...p} className={btnClass(variant, size, className)} />;
}
export function LinkButton({ href, variant = 'primary', size = 'md', className, children, prefetch }: { href: string; variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string; children: ReactNode; prefetch?: boolean }) {
  return <Link href={href} prefetch={prefetch} className={btnClass(variant, size, className)}>{children}</Link>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5', className)}>{children}</div>;
}

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';
export function Input({ label, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <input {...p} className={cn(field, className)} />
    </label>
  );
}
export function Textarea({ label, className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea {...p} className={cn(field, 'min-h-24', className)} />
    </label>
  );
}
export function Select({ label, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <select {...p} className={cn(field, 'appearance-auto', className)}>{children}</select>
    </label>
  );
}

const badgeTone = {
  slate: 'bg-slate-100 text-slate-700', blue: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700', violet: 'bg-violet-50 text-violet-700',
};
export function Badge({ tone = 'slate', children, className }: { tone?: keyof typeof badgeTone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTone[tone], className)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600', className)} role="status" aria-label="লোড হচ্ছে" />;
}
export function Loading({ label = 'লোড হচ্ছে…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><Spinner />{label}</div>;
}
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}
export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'green' | 'amber' | 'red' }) {
  const c = { brand: 'bg-brand-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' }[tone];
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', c)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export const accTone = (a: number) => (a >= 70 ? 'green' : a >= 50 ? 'amber' : 'red') as 'green' | 'amber' | 'red';

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-slate-600">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="!p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-white px-6 py-10 text-center">
      <p className="text-3xl" aria-hidden>😕</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">তথ্য আনা যায়নি</p>
      <p className="mt-1 text-slate-600">{message || 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'}</p>
      {onRetry && <Button className="mt-4" onClick={onRetry}>আবার চেষ্টা করুন</Button>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function QuestionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="লোড হচ্ছে">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-5 w-4/5" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-12" />)}
          </div>
        </div>
      ))}
      <span className="sr-only">লোড হচ্ছে…</span>
    </div>
  );
}