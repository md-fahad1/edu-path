'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LETTERS, bn, cn } from '@/lib/utils';
import { Badge, Button, Card, Empty, ErrorBox, Progress, Select, Spinner } from '@/components/ui';

export type Tree = { id: string; name: string; slug: string; subjects: { id: string; name: string; slug: string; chapters: { id: string; name: string; slug: string; _count: { questions: number }; topics: { id: string; name: string }[] }[] }[] }[];
type Q = { id: string; slug: string; text: string; difficulty: string; topic: { name: string } | null; options: { id: string; label: string; text: string }[] };
type Next = { question: Q | null; total: number; remaining: number };
type Ans = { isCorrect: boolean; correctOptionId: string | null; explanation: string | null; slug: string };

export function PracticeClient({ tree }: { tree: Tree }) {
  const sp = useSearchParams();
  const allChapters = useMemo(() => tree.flatMap((c) => c.subjects.flatMap((s) => s.chapters.map((ch) => ({ ...ch, label: `${c.name} › ${s.name} › ${ch.name}` })))), [tree]);
  const [chapterId, setChapterId] = useState(sp.get('chapterId') ?? '');
  const [topicId, setTopicId] = useState('');
  const [started, setStarted] = useState(!!sp.get('chapterId'));
  const ch = allChapters.find((c) => c.id === chapterId);

  if (!started) {
    return (
      <Card className="mx-auto max-w-xl !p-6">
        <div className="space-y-4">
          <Select label="চ্যাপ্টার" value={chapterId} onChange={(e) => { setChapterId(e.target.value); setTopicId(''); }}>
            <option value="">সব চ্যাপ্টার (র‍্যান্ডম)</option>
            {tree.map((c) => <optgroup key={c.id} label={c.name}>{allChapters.filter((x) => x.label.startsWith(c.name + ' ›')).map((x) => <option key={x.id} value={x.id}>{x.name} ({bn(x._count.questions)})</option>)}</optgroup>)}
          </Select>
          {ch && ch.topics.length > 1 && <Select label="টপিক (ঐচ্ছিক)" value={topicId} onChange={(e) => setTopicId(e.target.value)}><option value="">সব টপিক</option>{ch.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}
          <Button size="lg" className="w-full" onClick={() => setStarted(true)}>প্র্যাকটিস শুরু করুন →</Button>
        </div>
      </Card>
    );
  }
  return <Runner chapterId={chapterId} topicId={topicId} label={ch?.name ?? 'সব চ্যাপ্টার'} onExit={() => setStarted(false)} />;
}

function Runner({ chapterId, topicId, label, onExit }: { chapterId: string; topicId: string; label: string; onExit: () => void }) {
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
      if (chapterId) p.set('chapterId', chapterId);
      if (topicId) p.set('topicId', topicId);
      if (exclude.length) p.set('exclude', exclude.join(','));
      setCur(await api<Next>(`/practice/next?${p}`));
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }, [chapterId, topicId]);
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
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{label}</p><p className="text-xs text-slate-500">সঠিক {bn(score.right)}/{bn(score.done)}{!user && ' · লগইন করলে স্ট্যাট সেভ হবে'}</p></div>
        <Button size="sm" variant="outline" onClick={onExit}>পরিবর্তন</Button>
      </div>
      {cur && cur.total > 0 && <div className="mb-4"><Progress value={(seen.length / cur.total) * 100} /></div>}
      {err && <ErrorBox message={err} />}
      {loading && !q && <div className="flex justify-center py-16"><Spinner className="size-8" /></div>}
      {!loading && cur && !q && <Empty title={cur.total ? '🎉 সব প্রশ্ন শেষ!' : 'এখানে কোনো প্রশ্ন নেই'} hint={cur.total ? `আপনি ${bn(score.done)}টি সমাধান করেছেন, সঠিক ${bn(score.right)}টি।` : 'অন্য চ্যাপ্টার বেছে নিন।'} action={<Button onClick={onExit}>অন্য চ্যাপ্টার</Button>} />}
      {q && (
        <Card className="!p-4 sm:!p-6">
          <div className="mb-2 flex flex-wrap gap-1.5">{q.topic && <Badge tone="blue">{q.topic.name}</Badge>}</div>
          <h2 className="text-lg font-semibold leading-snug sm:text-xl">{q.text}</h2>
          <ul className="mt-4 space-y-2.5">
            {q.options.map((o, i) => {
              const right = ans?.correctOptionId === o.id;
              const wrong = ans && picked === o.id && !ans.isCorrect;
              return (
                <li key={o.id}>
                  <button type="button" disabled={!!picked} onClick={() => pick(o.id)} className={cn('flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors', !ans && !picked && 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 active:bg-brand-50', picked === o.id && !ans && 'border-brand-400 bg-brand-50', right && 'border-emerald-400 bg-emerald-50', wrong && 'border-rose-400 bg-rose-50', ans && !right && !wrong && 'border-slate-200 text-slate-500')}>
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold', right ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600')}>{LETTERS[i]}</span>
                    <span>{o.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {ans && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4" aria-live="polite">
              <p className={cn('font-semibold', ans.isCorrect ? 'text-emerald-700' : 'text-rose-600')}>{ans.isCorrect ? '✔ সঠিক উত্তর!' : '✘ ভুল হয়েছে'}</p>
              {ans.explanation && <p className="mt-1 text-slate-700">{ans.explanation}</p>}
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
