'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { SITE_NAME, cn } from '@/lib/utils';
import { btnClass } from './ui';
import { SearchBox } from './SearchBox';

const NAV = [
  { href: '/hsc', label: 'এইচএসসি' },
  { href: '/bcs', label: 'বিসিএস' },
  { href: '/admission', label: 'ভর্তি পরীক্ষা' },
  { href: '/practice', label: 'প্র্যাকটিস' },
  { href: '/model-test', label: 'মডেল টেস্ট' },
  { href: '/pricing', label: 'প্রিমিয়াম' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        <button className="-ml-2 rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="মেনু" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
        </button>
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">শ</span>
          <span className="hidden sm:inline">{SITE_NAME}</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="প্রধান মেনু">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn('rounded-lg px-3 py-2 text-[15px] font-medium hover:bg-slate-100', path.startsWith(n.href) ? 'text-brand-700' : 'text-slate-700')}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-56 md:block xl:w-72"><SearchBox compact /></div>
          {!ready ? <span className="skeleton h-9 w-20" /> : user ? (
            <div className="flex items-center gap-1.5">
              {(user.role === 'ADMIN' || user.role === 'TEACHER') && <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 sm:block">অ্যাডমিন</Link>}
              <Link href="/dashboard" className={btnClass('outline', 'sm')}>ড্যাশবোর্ড</Link>
              <button className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:block" onClick={async () => { await logout(); router.push('/'); }}>লগআউট</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">লগইন</Link>
              <Link href="/register" className={btnClass('primary', 'sm')}>রেজিস্টার</Link>
            </div>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-3 lg:hidden">
          <div className="mb-3 md:hidden"><SearchBox /></div>
          <nav className="grid grid-cols-2 gap-1" aria-label="মোবাইল মেনু">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 font-medium text-slate-800 hover:bg-slate-50">{n.label}</Link>)}
            {user && (user.role === 'ADMIN' || user.role === 'TEACHER') && <Link href="/admin" className="rounded-lg px-3 py-2.5 font-medium text-violet-700 hover:bg-violet-50">অ্যাডমিন</Link>}
            {user && <Link href="/bookmarks" className="rounded-lg px-3 py-2.5 font-medium text-slate-800 hover:bg-slate-50">বুকমার্ক</Link>}
            {user && <button className="rounded-lg px-3 py-2.5 text-left font-medium text-rose-600 hover:bg-rose-50" onClick={async () => { await logout(); router.push('/'); }}>লগআউট</button>}
          </nav>
        </div>
      )}
    </header>
  );
}
