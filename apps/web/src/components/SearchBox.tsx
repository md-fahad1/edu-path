'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { trunc } from '@/lib/utils';

type Res = { questions: { slug: string; text: string; chapter: { name: string } }[]; chapters: { name: string; slug: string; subject: { slug: string; category: { slug: string } } }[]; exams: { name: string; slug: string }[] };

export function SearchBox({ compact }: { compact?: boolean }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Res | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(() => api<Res>(`/search?q=${encodeURIComponent(q.trim())}`).then(setRes).catch(() => setRes(null)), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const empty = res && !res.questions.length && !res.chapters.length && !res.exams.length;
  return (
    <div ref={box} className="relative">
      <input
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        type="search" placeholder="প্রশ্ন, চ্যাপ্টার বা পরীক্ষা খুঁজুন…" aria-label="সার্চ"
        className={`w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 text-[15px] placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 ${compact ? 'py-2' : 'py-3'}`}
      />
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      {open && res && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] min-w-[18rem] overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl md:min-w-[26rem]">
          {empty && <p className="px-3 py-4 text-center text-slate-500">কিছু পাওয়া যায়নি</p>}
          {res.chapters.map((c) => <Link key={c.slug} href={`/${c.subject.category.slug}/${c.subject.slug}/${c.slug}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50"><span className="text-xs text-brand-600">চ্যাপ্টার</span><br />{c.name}</Link>)}
          {res.exams.map((e) => <Link key={e.slug} href={`/exam/${e.slug}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50"><span className="text-xs text-violet-600">পরীক্ষা</span><br />{e.name}</Link>)}
          {res.questions.map((x) => <Link key={x.slug} href={`/mcq/${x.slug}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50"><span className="text-xs text-slate-500">{x.chapter.name}</span><br />{trunc(x.text, 90)}</Link>)}
        </div>
      )}
    </div>
  );
}
