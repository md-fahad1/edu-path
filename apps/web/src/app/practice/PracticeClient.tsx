'use client';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LETTERS, bn, cn } from '@/lib/utils';
import { Badge, Button, Card, Empty, ErrorBox, Progress, Select, Spinner } from '@/components/ui';
import { RichText } from '@/components/RichText';

export type Tree = { id: string; name: string; slug: string; subjects: { id: string; name: string; slug: string; chapters: { id: string; name: string; slug: string; _count: { questions: number }; topics: { id: string; name: string }[] }[] }[] }[];
type Mode = 'smart' | 'random' | 'notebook';
type Reason = 'review' | 'weak' | 'new' | 'again' | null;
type Q = { id: string; slug: string; text: string; difficulty: string; topic: { name: string } | null; options: { id: string; label: string; text: string }[] };
type Next = { question: Q | null; total: number; remaining: number; reason: Reason };
type NbEvent = 'added' | 'progress' | 'mastered' | null;
type Ans = { isCorrect: boolean; correctOptionId: string | null; explanation: string | null; slug: string; notebook: { event: NbEvent; inNotebook: boolean; nextReviewAt: string | null } | null };
type NbSummary = { total: number; due: number; mastered: number };

const MODES = [
  { v: 'smart', icon: '🧠', title: 'স্মার্ট', desc: 'ভুল করা প্রশ্ন সময়মতো আবার, দুর্বল টপিক আগে, আর না-দেখা প্রশ্ন নতুন করে – আপনার জন্য সাজানো।' },
  { v: 'random', icon: '🎲', title: 'র‍্যান্ডম', desc: 'যেকোনো ক্রমে প্রশ্ন। লগইন ছাড়াও চলবে।' },
  { v: 'notebook', icon: '📓', title: 'নোটবুক', desc: 'আপনার ভুল করা প্রশ্নগুলো আবার সমাধান করুন। ঠিক সময়ে ৩ বার সঠিক হলে প্রশ্নটি নোটবুক থেকে বিদায়।' },
] as const;

const REASON: Record<Exclude<Reason, null>, { label: string; tone: 'amber' | 'red' | 'blue' | 'slate' }> = {
  review: { label: '🔁 পুনরাবৃত্তি', tone: 'amber' },
  weak: { label: '⚠ দুর্বল টপিক', tone: 'red' },
  new: { label: '🆕 নতুন প্রশ্ন', tone: 'blue' },
  again: { label: '↻ আগে দেখা', tone: 'slate' },
};

export function PracticeClient({ tree }: { tree: Tree }) {
  const sp = useSearchParams();
  const { user, ready } = useAuth();
  const allChapters = useMemo(() => tree.flatMap((c) => c.subjects.flatMap((s) => s.chapters.map((ch) => ({ ...ch, label: `${c.name} › ${s.name} › ${ch.name}` })))), [tree]);

  const urlMode = sp.get('mode');
  const [mode, setMode] = useState<Mode>(urlMode === 'smart' || urlMode === 'notebook' || urlMode === 'random' ? urlMode : 'random');
  const touched = useRef(!!urlMode);
  const [chapterId, setChapterId] = useState(sp.get('chapterId') ?? '');
  const [topicId, setTopicId] = useState('');
  const [started, setStarted] = useState(!!sp.get('chapterId') || !!urlMode);
  const ch = allChapters.find((c) => c.id === chapterId);

  // login thakle default "smart"
  useEffect(() => { if (ready && user && !touched.current && !started) setMode('smart'); }, [ready, user, started]);

  const nb = useQuery({ queryKey: ['nb', 'summary'], queryFn: () => api<NbSummary>('/practice/notebook/summary'), enabled: !!user });

  if (!started) {
    const locked = ready && !user;
    const cur = MODES.find((m) => m.v === mode)!;
    return (
      <Card className="mx-auto max-w-xl !p-6">
        <div role="tablist" aria-label="প্র্যাকটিস মোড" className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const off = locked && m.v !== 'random';
            return (
              <button
                key={m.v} type="button" role="tab" aria-selected={mode === m.v} disabled={off}
                onClick={() => { touched.current = true; setMode(m.v); }}
                className={cn('rounded-xl border-2 px-2 py-3 text-center transition disabled:opacity-50', mode === m.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 hover:border-brand-300')}
              >
                <span className="block text-2xl" aria-hidden>{m.icon}</span>
                <span className="text-sm font-semibold">{m.title}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-slate-600">{cur.desc}</p>
        {locked && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">স্মার্ট ও নোটবুক মোড পেতে <a href="/login?next=/practice" className="font-semibold underline">লগইন করুন</a>।</p>}

        <div className="mt-4 space-y-4">
          {mode === 'notebook' ? (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              {nb.data ? <>📓 নোটবুকে আছে <b>{bn(nb.data.total)}টি</b> · আজ রিভিশনের সময় হয়েছে <b>{bn(nb.data.due)}টি</b>{nb.data.mastered > 0 && <> · শিখে ফেলেছেন <b>{bn(nb.data.mastered)}টি</b></>}</> : 'নোটবুক লোড হচ্ছে…'}
            </p>
          ) : (
            <>
              <Select label="চ্যাপ্টার" value={chapterId} onChange={(e) => { setChapterId(e.target.value); setTopicId(''); }}>
                <option value="">সব চ্যাপ্টার</option>
                {tree.map((c) => <optgroup key={c.id} label={c.name}>{allChapters.filter((x) => x.label.startsWith(c.name + ' ›')).map((x) => <option key={x.id} value={x.id}>{x.name} ({bn(x._count.questions)})</option>)}</optgroup>)}
              </Select>
              {ch && ch.topics.length > 1 && <Select label="টপিক (ঐচ্ছিক)" value={topicId} onChange={(e) => setTopicId(e.target.value)}><option value="">সব টপিক</option>{ch.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}
            </>
          )}
          <Button size="lg" className="w-full" disabled={mode === 'notebook' && !!nb.data && nb.data.total === 0} onClick={() => setStarted(true)}>
            {mode === 'notebook' && nb.data?.total === 0 ? 'নোটবুক এখন খালি 🎉' : 'শুরু করুন →'}
          </Button>
        </div>
      </Card>
    );
  }
  const icon = MODES.find((m) => m.v === mode)!.icon;
  return (
    <Runner
      key={mode}
      mode={mode} chapterId={chapterId} topicId={topicId}
      label={`${icon} ${mode === 'notebook' ? 'ভুলের নোটবুক' : ch?.name ?? 'সব চ্যাপ্টার'}`}
      onExit={() => setStarted(false)}
    />
  );
}

function nbMessage(n: Ans['notebook']) {
  if (!n?.event) return null;
  if (n.event === 'added') return { bad: true, text: '📓 প্রশ্নটি নোটবুকে যোগ হয়েছে, কাল আবার দেখাব।' };
  if (n.event === 'progress') {
    const d = n.nextReviewAt ? Math.max(1, Math.round((new Date(n.nextReviewAt).getTime() - Date.now()) / 86_400_000)) : 1;
    return { bad: false, text: `📈 দারুণ! প্রশ্নটি আবার দেখাব ${bn(d)} দিন পরে।` };
  }
  return { bad: false, text: '🎉 শিখে ফেলেছেন! প্রশ্নটি নোটবুক থেকে সরানো হলো।' };
}

function Runner({ mode, chapterId, topicId, label, onExit }: { mode: Mode; chapterId: string; topicId: string; label: string; onExit: () => void }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [cur, setCur] = useState<Next | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [ans, setAns] = useState<Ans | null>(null);
  const [score, setScore] = useState({ done: 0, right: 0 });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const user = useAuth((s) => s.user);

  const load = useCallback(async (exclude: string[]) => {
    setLoading(true); setErr(''); setPicked(null); setAns(null);
    try {
      const p = new URLSearchParams();
      p.set('mode', mode);
      if (chapterId) p.set('chapterId', chapterId);
      if (topicId) p.set('topicId', topicId);
      if (exclude.length) p.set('exclude', exclude.join(','));
      setCur(await api<Next>(`/practice/next?${p}`));
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }, [mode, chapterId, topicId]);
  useEffect(() => { load([]); }, [load]);

  async function pick(optionId: string) {
    if (picked || !cur?.question) return;
    setPicked(optionId);
    try {
      const r = await api<Ans>('/practice/answer', { method: 'POST', json: { questionId: cur.question.id, optionId } });
      setAns(r);
      setScore((s) => ({ done: s.done + 1, right: s.right + (r.isCorrect ? 1 : 0) }));
    } catch (e: any) { setErr(e.message); setPicked(null); }
  }
  function next() { const ex = [...seen, cur!.question!.id]; setSeen(ex); load(ex); }

  const q = cur?.question;
  const reason = cur?.reason ? REASON[cur.reason] : null;
  const msg = nbMessage(ans?.notebook ?? null);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{label}</p><p className="text-xs text-slate-500">সঠিক {bn(score.right)}/{bn(score.done)}{!user && ' · লগইন করলে স্ট্যাট সেভ হবে'}</p></div>
        <Button size="sm" variant="outline" onClick={onExit}>পরিবর্তন</Button>
      </div>
      {cur && cur.total > 0 && <div className="mb-4"><Progress value={(seen.length / cur.total) * 100} /></div>}
      {err && <ErrorBox message={err} />}
      {loading && !q && <div className="flex justify-center py-16"><Spinner className="size-8" /></div>}
      {!loading && cur && !q && (
        mode === 'notebook'
          ? <Empty title={cur.total ? '✅ নোটবুকের রিভিশন শেষ!' : '🎉 নোটবুক এখন খালি!'} hint={cur.total ? `আপনি ${bn(score.done)}টি সমাধান করেছেন, সঠিক ${bn(score.right)}টি।` : 'প্র্যাকটিসে ভুল করা প্রশ্নগুলো এখানে জমা হবে।'} action={<Button onClick={onExit}>স্মার্ট প্র্যাকটিস</Button>} />
          : <Empty title={cur.total ? '🎉 সব প্রশ্ন শেষ!' : 'এখানে কোনো প্রশ্ন নেই'} hint={cur.total ? `আপনি ${bn(score.done)}টি সমাধান করেছেন, সঠিক ${bn(score.right)}টি।` : 'অন্য চ্যাপ্টার বেছে নিন।'} action={<Button onClick={onExit}>অন্য চ্যাপ্টার</Button>} />
      )}
      {q && (
        <Card className="!p-4 sm:!p-6">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {reason && <Badge tone={reason.tone}>{reason.label}</Badge>}
            {q.topic && <Badge tone="blue">{q.topic.name}</Badge>}
          </div>
          <h2 className="text-lg font-semibold leading-snug sm:text-xl"><RichText text={q.text} /></h2>
          <ul className="mt-4 space-y-2.5">
            {q.options.map((o, i) => {
              const right = ans?.correctOptionId === o.id;
              const wrong = ans && picked === o.id && !ans.isCorrect;
              return (
                <li key={o.id}>
                  <button type="button" disabled={!!picked} onClick={() => pick(o.id)} className={cn('flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors', !ans && !picked && 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 active:bg-brand-50', picked === o.id && !ans && 'border-brand-400 bg-brand-50', right && 'border-emerald-400 bg-emerald-50', wrong && 'border-rose-400 bg-rose-50', ans && !right && !wrong && 'border-slate-200 text-slate-500')}>
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold', right ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600')}>{LETTERS[i]}</span>
                    <RichText text={o.text} />
                    {right && <span className="sr-only"> (সঠিক উত্তর)</span>}
                    {wrong && <span className="sr-only"> (আপনার ভুল উত্তর)</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {ans && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4" aria-live="polite">
              <p className={cn('font-semibold', ans.isCorrect ? 'text-emerald-700' : 'text-rose-600')}>{ans.isCorrect ? '✔ সঠিক উত্তর!' : '✘ ভুল হয়েছে'}</p>
              {ans.explanation && <p className="mt-1 text-slate-700"><RichText text={ans.explanation} /></p>}
              {msg && <p className={cn('mt-3 rounded-lg px-3 py-2 text-sm', msg.bad ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{msg.text}</p>}
            </div>
          )}
          <div className="mt-5 flex justify-end">
            {ans ? <Button size="lg" onClick={next} className="w-full sm:w-auto">{cur!.remaining > 0 ? 'পরের প্রশ্ন →' : 'শেষ করুন'}</Button> : <Button variant="ghost" disabled={!!picked} onClick={next}>স্কিপ করুন</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}