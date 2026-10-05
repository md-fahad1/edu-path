'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import { LETTERS, bn, cn, fmtTime } from '@/lib/utils';
import { Button, Card, ErrorBox, Loading, LinkButton } from '@/components/ui';
import { RichText } from '@/components/RichText';
import { toast } from '@/lib/toast';
import { useTest, type Attempt } from './store';

export function TestRunner({ slug }: { slug: string }) {
  const { allowed, ready } = useRequireAuth();
  const router = useRouter();
  const [att, setAtt] = useState<Attempt | null>(null);
  const [err, setErr] = useState<{ msg: string; premium?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const st = useTest();
  const submitted = useRef(false);
  const warned = useRef({ five: false, one: false });

  // --- start / resume
  useEffect(() => {
    if (!allowed) return;
    let dead = false;
    (async () => {
      try {
        const t = await api<{ id: string }>(`/tests/${slug}`);
        const a = await api<Attempt>(`/tests/${t.id}/start`, { method: 'POST' });
        if (dead) return;
        useTest.getState().load(a);
        setAtt(a);
      } catch (e: any) {
        if (dead) return;
        const premium = e instanceof ApiError && e.code === 'PREMIUM_REQUIRED';
        setErr({ msg: e.message, premium });
      }
    })();
    return () => { dead = true; };
  }, [allowed, slug]);

  // --- save one answer (fail hole pending-e thake, online ashle retry)
  const save = useCallback(async (qid: string, oid: string | null) => {
    const id = useTest.getState().attemptId;
    if (!id) return;
    try { await api(`/attempts/${id}/answer`, { method: 'PATCH', json: { questionId: qid, optionId: oid } }); useTest.getState().clearPending(qid, oid); }
    catch (e) { if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) useTest.getState().clearPending(qid, oid); }
  }, []);
  const flush = useCallback(async () => {
    const p = useTest.getState().pending;
    await Promise.all(Object.entries(p).map(([q, o]) => save(q, o)));
  }, [save]);

  useEffect(() => {
    const up = () => { setOnline(true); flush(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    setOnline(navigator.onLine);
    const iv = setInterval(() => { if (Object.keys(useTest.getState().pending).length) flush(); }, 8000);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); clearInterval(iv); };
  }, [flush]);

  const finish = useCallback(async () => {
    if (submitted.current || !att) return;
    submitted.current = true; setSubmitting(true);
    try {
      await flush();
      await api(`/attempts/${att.attemptId}/submit`, { method: 'POST' });
      useTest.getState().reset();
      router.replace(`/result/${att.attemptId}`);
    } catch (e: any) { submitted.current = false; setSubmitting(false); setErr({ msg: e.message }); }
  }, [att, flush, router]);

  // --- timer (server-synced deadline), time shesh hole auto submit
  useEffect(() => {
    if (!att) return;
    const tick = () => {
      const s = Math.round((useTest.getState().deadlineMs - Date.now()) / 1000);
      setLeft(s);
      if (att.durationSec > 300 && s <= 300 && s > 60 && !warned.current.five) { warned.current.five = true; toast.info('⏱ আর ৫ মিনিট বাকি'); }
      if (att.durationSec > 60 && s <= 60 && s > 0 && !warned.current.one) { warned.current.one = true; toast.error('⏱ আর ১ মিনিট বাকি!'); }
      if (s <= 0) finish();
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [att, finish]);

  // --- refresh/tab close warning
  useEffect(() => {
    if (!att) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [att]);

  // --- keyboard: 1-4 select, n/p navigate (dialog khola thakle bondho)
  useEffect(() => {
    if (!att || confirm || paletteOpen) return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const s = useTest.getState();
      const q = att.questions[s.index];
      if (['1', '2', '3', '4'].includes(e.key)) { const o = q.options[Number(e.key) - 1]; if (o) { s.answer(q.id, o.id); save(q.id, o.id); } }
      if (e.key === 'ArrowRight' || e.key === 'n') s.go(Math.min(att.questions.length - 1, s.index + 1));
      if (e.key === 'ArrowLeft' || e.key === 'p') s.go(Math.max(0, s.index - 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [att, save, confirm, paletteOpen]);

  // --- Esc diye dialog bondho
  useEffect(() => {
    if (!confirm && !paletteOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) { setConfirm(false); setPaletteOpen(false); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [confirm, paletteOpen, submitting]);

  if (!ready || (!att && !err)) return <Loading label="পরীক্ষা প্রস্তুত হচ্ছে…" />;
  if (!allowed) return <Loading label="লগইন পেজে নেওয়া হচ্ছে…" />;
  if (err && !att) {
    return (
      <Card className="mx-auto max-w-md text-center">
        {err.premium ? (<><div className="text-4xl">👑</div><h1 className="mt-2 text-xl font-bold">এটি প্রিমিয়াম টেস্ট</h1><p className="mt-1 text-slate-600">এই টেস্ট দিতে প্রিমিয়াম মেম্বারশিপ লাগবে।</p><div className="mt-5 flex justify-center gap-3"><LinkButton href="/pricing">প্ল্যান দেখুন</LinkButton><LinkButton href="/model-test" variant="outline">ফ্রি টেস্ট</LinkButton></div></>)
          : (<><ErrorBox message={err.msg} /><LinkButton href="/model-test" className="mt-4">টেস্ট তালিকা</LinkButton></>)}
      </Card>
    );
  }
  if (!att) return null;

  const total = att.questions.length;
  const q = att.questions[st.index];
  const answered = att.questions.filter((x) => st.answers[x.id]).length;
  const urgent = left !== null && left <= 60;

  const choose = (oid: string) => { const next = st.answers[q.id] === oid ? null : oid; st.answer(q.id, next); save(q.id, next); };

  const Palette = (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
      {att.questions.map((x, i) => (
        <button
          key={x.id} onClick={() => { st.go(i); setPaletteOpen(false); }}
          aria-label={`প্রশ্ন ${i + 1}, ${st.answers[x.id] ? 'উত্তর দেওয়া' : 'বাকি'}${st.marked[x.id] ? ', মার্ক করা' : ''}`}
          aria-current={i === st.index ? 'true' : undefined}
          className={cn('relative aspect-square rounded-lg text-sm font-semibold ring-offset-1', st.answers[x.id] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700', st.marked[x.id] && '!bg-amber-400 !text-slate-900', i === st.index && 'ring-2 ring-brand-600')}>
          {bn(i + 1)}
        </button>
      ))}
    </div>
  );
  const Legend = <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>🟩 উত্তর দেওয়া</span><span>⬜ বাকি</span><span>🟨 মার্ক করা</span></p>;

  return (
    <div className="mx-auto max-w-5xl pb-24 lg:pb-0">
      <div className="sticky top-14 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:top-16 sm:mx-0 sm:rounded-2xl sm:border">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{att.test.title}</p><p className="text-xs text-slate-500">{bn(answered)}/{bn(total)} উত্তর দেওয়া {!online && <span className="font-semibold text-rose-600">· অফলাইন (নেট এলে সেভ হবে)</span>}</p></div>
        <div role="timer" className={cn('rounded-xl px-3 py-1.5 font-mono text-lg font-bold tabular-nums', urgent ? 'animate-pulse bg-rose-100 text-rose-700' : 'bg-brand-50 text-brand-700')} aria-label="বাকি সময়">⏱ {left === null ? '--:--' : fmtTime(left)}</div>
      </div>

      {err && <div className="mb-3"><ErrorBox message={err.msg} /></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        <Card className="!p-4 sm:!p-6">
          <p className="text-sm font-medium text-slate-500">প্রশ্ন {bn(st.index + 1)} / {bn(total)}</p>
          <h1 className="mt-1 text-lg font-semibold leading-snug sm:text-xl"><RichText text={q.text} /></h1>
          <ul className="mt-4 space-y-2.5">
            {q.options.map((o, i) => {
              const on = st.answers[q.id] === o.id;
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => choose(o.id)} aria-pressed={on} className={cn('flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors', on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 active:bg-brand-50')}>
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold', on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{LETTERS[i]}</span>
                    <RichText text={o.text} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => st.toggleMark(q.id)} aria-pressed={!!st.marked[q.id]}>{st.marked[q.id] ? '🟨 মার্ক সরান' : '🏳 রিভিউয়ের জন্য মার্ক'}</Button>
            {st.answers[q.id] && <Button variant="ghost" size="sm" onClick={() => { st.answer(q.id, null); save(q.id, null); }}>উত্তর মুছুন</Button>}
          </div>
          <div className="mt-4 hidden justify-between gap-3 border-t border-slate-100 pt-4 lg:flex">
            <Button variant="outline" disabled={st.index === 0} onClick={() => st.go(st.index - 1)}>← আগের</Button>
            {st.index < total - 1 ? <Button onClick={() => st.go(st.index + 1)}>পরের →</Button> : <Button variant="success" onClick={() => setConfirm(true)}>সাবমিট</Button>}
          </div>
        </Card>

        <aside className="hidden lg:block" aria-label="প্রশ্ন প্যালেট">
          <Card className="sticky top-36"><p className="mb-3 font-semibold">প্রশ্ন প্যালেট</p>{Palette}{Legend}<Button variant="success" className="mt-4 w-full" onClick={() => setConfirm(true)}>পরীক্ষা শেষ করুন</Button></Card>
        </aside>
      </div>

      {/* mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden">
        <Button variant="outline" disabled={st.index === 0} onClick={() => st.go(st.index - 1)} aria-label="আগের প্রশ্ন">←</Button>
        <Button variant="outline" className="flex-1" onClick={() => setPaletteOpen(true)}>প্যালেট ({bn(answered)}/{bn(total)})</Button>
        {st.index < total - 1 ? <Button onClick={() => st.go(st.index + 1)} aria-label="পরের প্রশ্ন">→</Button> : <Button variant="success" onClick={() => setConfirm(true)}>সাবমিট</Button>}
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="max-h-[75vh] w-full overflow-auto rounded-t-3xl bg-white p-5" role="dialog" aria-modal="true" aria-label="প্রশ্ন প্যালেট" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><p className="font-semibold">প্রশ্ন প্যালেট</p><button className="text-slate-500" onClick={() => setPaletteOpen(false)}>বন্ধ ✕</button></div>
            {Palette}{Legend}
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 id="confirm-title" className="text-lg font-bold">পরীক্ষা সাবমিট করবেন?</h2>
            <p className="mt-2 text-slate-600">{bn(answered)}টি উত্তর দিয়েছেন{total - answered > 0 && `, ${bn(total - answered)}টি বাকি আছে`}। সাবমিটের পর আর বদলানো যাবে না।</p>
            <div className="mt-5 flex gap-2"><Button variant="success" className="flex-1" disabled={submitting} onClick={finish}>{submitting ? 'জমা হচ্ছে…' : 'হ্যাঁ, সাবমিট'}</Button><Button variant="outline" autoFocus disabled={submitting} onClick={() => setConfirm(false)}>ফিরে যান</Button></div>
          </div>
        </div>
      )}
      {left !== null && left <= 0 && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50"><Card><Loading label="সময় শেষ! ফলাফল তৈরি হচ্ছে…" /></Card></div>}
      <p className="mt-4 hidden text-center text-xs text-slate-400 lg:block">শর্টকাট: ১–৪ = অপশন, ← → = নেভিগেট · <Link href="/model-test" className="underline">বাতিল</Link></p>
    </div>
  );
}