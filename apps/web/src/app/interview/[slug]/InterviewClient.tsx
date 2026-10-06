'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { RichText } from '@/components/RichText';
import { toast } from '@/lib/toast';
import { bn, cn } from '@/lib/utils';
import { Badge, Button, Card, Empty, Input, Progress, Select } from '@/components/ui';

export type IvQ = { id: string; slug: string; question: string; answer: string; tips: string | null; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; tags: string[] };
type Prog = Record<string, 'KNOWN' | 'REVIEW'>;
const DIFF = { EASY: ['সহজ', 'green'], MEDIUM: ['মাঝারি', 'amber'], HARD: ['কঠিন', 'red'] } as const;

export function InterviewClient({ questions }: { questions: IvQ[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'list' | 'cards'>('list');
  const [diff, setDiff] = useState<'ALL' | IvQ['difficulty']>('ALL');
  const [show, setShow] = useState<'all' | 'review' | 'unknown'>('all');
  const [search, setSearch] = useState('');
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);

  const progQ = useQuery({ queryKey: ['iv-progress'], queryFn: () => api<Prog>('/interview/progress'), enabled: !!user });
  const prog = useMemo<Prog>(() => progQ.data ?? {}, [progQ.data]);
  const known = questions.filter((q) => prog[q.id] === 'KNOWN').length;

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) =>
      (diff === 'ALL' || q.difficulty === diff) &&
      (show === 'all' || (show === 'review' ? prog[q.id] === 'REVIEW' : prog[q.id] !== 'KNOWN')) &&
      (!s || `${q.question} ${q.answer} ${q.tags.join(' ')}`.toLowerCase().includes(s)),
    );
  }, [questions, diff, show, search, prog]);

  async function mark(q: IvQ, s: 'KNOWN' | 'REVIEW') {
    if (!user) { toast.info('অগ্রগতি সেভ করতে লগইন করুন'); return; }
    const prev = qc.getQueryData<Prog>(['iv-progress']) ?? {};
    const next: Prog = { ...prev };
    if (prev[q.id] === s) delete next[q.id]; else next[q.id] = s; // ekoi button abar chaple chinho tule jay
    qc.setQueryData(['iv-progress'], next);
    try {
      await api(`/interview/progress/${q.id}`, { method: 'PUT', json: { status: next[q.id] ?? null } });
    } catch (e) {
      qc.setQueryData(['iv-progress'], prev);
      toast.error((e as Error).message);
    }
  }

  const cur = list.length ? Math.min(idx, list.length - 1) : -1;
  const card = cur >= 0 ? list[cur] : null;
  const go = (d: number) => { setIdx(Math.max(0, Math.min(list.length - 1, cur + d))); setFlip(false); };

  return (
    <>
      <Card className="mb-4 space-y-3">
        {user ? (
          <div>
            <div className="mb-1 flex justify-between text-sm"><span>আপনি জানেন <b>{bn(known)}</b>/{bn(questions.length)}টি</span><span className="text-slate-500">{bn(Math.round((known / Math.max(1, questions.length)) * 100))}%</span></div>
            <Progress value={Math.round((known / Math.max(1, questions.length)) * 100)} tone="green" />
          </div>
        ) : (
          <p className="text-sm text-slate-600">💡 <Link href="/login?next=/interview" className="font-semibold text-brand-700 underline">লগইন করলে</Link> কোন প্রশ্ন জানেন আর কোনটা আবার দেখবেন, তা মনে থাকবে।</p>
        )}
        <div className="flex gap-2">
          <Button variant={mode === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('list')}>📋 তালিকা</Button>
          <Button variant={mode === 'cards' ? 'primary' : 'outline'} size="sm" onClick={() => { setMode('cards'); setIdx(0); setFlip(false); }}>🃏 ফ্ল্যাশকার্ড</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input label="খুঁজুন" value={search} onChange={(e) => { setSearch(e.target.value); setIdx(0); }} placeholder="প্রশ্ন বা শব্দ লিখুন" />
          <Select label="কঠিনতা" value={diff} onChange={(e) => { setDiff(e.target.value as typeof diff); setIdx(0); }}><option value="ALL">সব</option><option value="EASY">সহজ</option><option value="MEDIUM">মাঝারি</option><option value="HARD">কঠিন</option></Select>
          <Select label="দেখান" value={show} onChange={(e) => { setShow(e.target.value as typeof show); setIdx(0); }} disabled={!user}><option value="all">সব প্রশ্ন</option><option value="review">শুধু "আবার দেখব"</option><option value="unknown">যেগুলো এখনো জানি না</option></Select>
        </div>
      </Card>

      {!list.length ? (
        <Empty title="কোনো প্রশ্ন পাওয়া যায়নি" hint="ফিল্টার বা সার্চ বদলে দেখুন।" />
      ) : mode === 'list' ? (
        <ul className="space-y-3">
          {list.map((q) => (
            <li key={q.id}>
              <details className="group rounded-2xl border border-slate-200 bg-white open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="mt-0.5 text-slate-400 transition group-open:rotate-90" aria-hidden>▸</span>
                  <span className="min-w-0 flex-1 font-medium leading-relaxed"><RichText text={q.question} /></span>
                  <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                    {prog[q.id] === 'KNOWN' && <span title="জানি" aria-label="জানি">✅</span>}
                    {prog[q.id] === 'REVIEW' && <span title="আবার দেখব" aria-label="আবার দেখব">🔁</span>}
                    <Badge tone={DIFF[q.difficulty][1]}>{DIFF[q.difficulty][0]}</Badge>
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <Answer q={q} />
                  <Marks q={q} s={prog[q.id]} onMark={mark} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : card && (
        <div>
          <p className="mb-2 text-center text-sm text-slate-500">কার্ড {bn(cur + 1)}/{bn(list.length)}</p>
          <Card className="min-h-[16rem] space-y-4">
            <div className="flex items-start justify-between gap-2">
              <Badge tone={DIFF[card.difficulty][1]}>{DIFF[card.difficulty][0]}</Badge>
              {prog[card.id] === 'KNOWN' && <span>✅ জানি</span>}
              {prog[card.id] === 'REVIEW' && <span>🔁 আবার দেখব</span>}
            </div>
            <div className="text-lg font-semibold leading-relaxed"><RichText text={card.question} /></div>
            {flip ? (
              <>
                <hr className="border-slate-100" />
                <Answer q={card} />
                <Marks q={card} s={prog[card.id]} onMark={(q, s) => { mark(q, s); if (cur < list.length - 1) go(1); }} />
              </>
            ) : (
              <Button className="w-full" onClick={() => setFlip(true)}>👁 উত্তর দেখুন</Button>
            )}
          </Card>
          <div className="mt-3 flex justify-between">
            <Button variant="outline" disabled={cur === 0} onClick={() => go(-1)}>← আগের</Button>
            <Button variant="outline" disabled={cur >= list.length - 1} onClick={() => go(1)}>পরের →</Button>
          </div>
        </div>
      )}
    </>
  );
}

function Answer({ q }: { q: IvQ }) {
  return (
    <>
      <div className="whitespace-pre-line leading-8 text-slate-800"><RichText text={q.answer} /></div>
      {q.tips && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-900">
          💡 <b>টিপস:</b> <span className="whitespace-pre-line"><RichText text={q.tips} /></span>
        </div>
      )}
      {q.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{q.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
    </>
  );
}

function Marks({ q, s, onMark }: { q: IvQ; s?: 'KNOWN' | 'REVIEW'; onMark: (q: IvQ, s: 'KNOWN' | 'REVIEW') => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={() => onMark(q, 'KNOWN')} aria-pressed={s === 'KNOWN'} className={cn('rounded-xl border px-3.5 py-2 text-sm font-medium', s === 'KNOWN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-400')}>✅ জানি</button>
      <button onClick={() => onMark(q, 'REVIEW')} aria-pressed={s === 'REVIEW'} className={cn('rounded-xl border px-3.5 py-2 text-sm font-medium', s === 'REVIEW' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-400')}>🔁 আবার দেখব</button>
    </div>
  );
}