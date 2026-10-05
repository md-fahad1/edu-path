'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import { LETTERS, SITE, bn, cn, fmtTime } from '@/lib/utils';
import { Badge, Card, ErrorState, LinkButton, Loading, Progress, Stat, accTone } from '@/components/ui';
import { RichText } from '@/components/RichText';
import { ShareButtons } from '@/components/ShareButtons';

type Res = {
  attemptId: string; status: string; test: { id: string; title: string; slug: string };
  score: number; totalMarks: number; correct: number; wrong: number; skipped: number; seconds: number; rank: number; participants: number;
  topics: { topic: string; attempted: number; correct: number; accuracy: number }[];
  review: { no: number; id: string; slug: string; text: string; explanation: string | null; topic: string | null; options: { id: string; label: string; text: string; isCorrect: boolean }[]; selectedOptionId: string | null; isCorrect: boolean; skipped: boolean }[];
};

export function ResultClient({ id }: { id: string }) {
  const { allowed } = useRequireAuth();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['result', id], queryFn: () => api<Res>(`/attempts/${id}/result`), enabled: allowed });
  const [filter, setFilter] = useState<'all' | 'wrong' | 'skipped'>('all');

  if (!allowed || isLoading) return <Loading label="ফলাফল লোড হচ্ছে…" />;
  if (error || !data) return <div className="mx-auto max-w-md"><ErrorState message={(error as Error)?.message ?? 'ফলাফল পাওয়া যায়নি'} onRetry={() => refetch()} /></div>;
  const pct = data.totalMarks ? Math.max(0, (data.score / data.totalMarks) * 100) : 0;
  const weak = [...data.topics].filter((t) => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const list = data.review.filter((r) => (filter === 'wrong' ? !r.isCorrect && !r.skipped : filter === 'skipped' ? r.skipped : true));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="text-center !p-6 sm:!p-8">
        <p className="text-sm text-slate-500">{data.test.title}</p>
        <div role="img" aria-label={`স্কোর ${bn(data.score)} / ${bn(data.totalMarks)}`} className="mx-auto mt-3 grid size-32 place-items-center rounded-full" style={{ background: `conic-gradient(${pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'} ${pct * 3.6}deg, #e2e8f0 0deg)` }}>
          <div className="grid size-24 place-items-center rounded-full bg-white"><div><p className="text-3xl font-bold leading-none">{bn(data.score)}</p><p className="mt-1 text-xs text-slate-500">/ {bn(data.totalMarks)}</p></div></div>
        </div>
        <p className="mt-3 text-lg font-semibold">{pct >= 80 ? '🎉 অসাধারণ!' : pct >= 60 ? '👏 ভালো করেছেন' : pct >= 40 ? '💪 আরেকটু অনুশীলন দরকার' : '📚 চলুন আবার চেষ্টা করি'}</p>
        {data.status === 'EXPIRED' && <p className="mt-1 text-sm text-amber-700">সময় শেষে স্বয়ংক্রিয়ভাবে জমা হয়েছে</p>}
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="সঠিক" value={<span className="text-emerald-600">{bn(data.correct)}</span>} />
        <Stat label="ভুল" value={<span className="text-rose-600">{bn(data.wrong)}</span>} />
        <Stat label="স্কিপ" value={bn(data.skipped)} />
        <Stat label="সময়" value={fmtTime(data.seconds)} />
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">আপনার অবস্থান</p><p className="text-2xl font-bold">🏆 {bn(data.rank)} <span className="text-base font-normal text-slate-500">/ {bn(data.participants)} জন</span></p></div><LinkButton variant="outline" href={`/model-test/${data.test.slug}`}>লিডারবোর্ড দেখুন</LinkButton></Card>

      <Card>
        <p className="mb-2 font-semibold">📣 বন্ধুদের জানান, চ্যালেঞ্জ করুন</p>
        <ShareButtons
          url={`${SITE}/model-test/${data.test.slug}`}
          title={data.test.title}
          text={`আমি "${data.test.title}" টেস্টে ${bn(data.score)}/${bn(data.totalMarks)} পেয়েছি (সঠিক ${bn(data.correct)}টি)! তুমিও চেষ্টা করে দেখো:`}
        />
      </Card>

      {data.topics.length > 0 && (
        <Card><h2 className="mb-3 font-semibold">টপিকভিত্তিক সঠিকতা</h2><div className="space-y-3">{data.topics.map((t) => <div key={t.topic}><div className="mb-1 flex justify-between text-sm"><span>{t.topic}</span><span className="text-slate-500">{bn(t.correct)}/{bn(t.attempted)} · {bn(t.accuracy)}%</span></div><Progress value={t.accuracy} tone={accTone(t.accuracy)} /></div>)}</div>
          {weak.length > 0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">💡 দুর্বল টপিক: <b>{weak.map((w) => w.topic).join(', ')}</b> – এগুলোতে আবার প্র্যাকটিস করুন।</p>}
        </Card>
      )}

      <div className="flex flex-wrap gap-3"><LinkButton href={`/model-test/${data.test.slug}/take`} prefetch={false}>আবার দিন</LinkButton><LinkButton href="/practice" variant="outline">প্র্যাকটিস করুন</LinkButton><LinkButton href="/dashboard" variant="ghost">ড্যাশবোর্ড</LinkButton></div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">উত্তর পর্যালোচনা</h2>
          <div className="flex gap-1.5">{([['all', 'সব'], ['wrong', 'ভুল'], ['skipped', 'স্কিপ']] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium', filter === k ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200')}>{l}</button>)}</div></div>
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id} className={cn('!p-4 border-l-4', r.skipped ? 'border-l-slate-300' : r.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500')}>
              <div className="flex items-start justify-between gap-2"><p className="font-semibold leading-snug">{bn(r.no)}. <RichText text={r.text} /></p><Badge tone={r.skipped ? 'slate' : r.isCorrect ? 'green' : 'red'}>{r.skipped ? 'স্কিপ' : r.isCorrect ? 'সঠিক' : 'ভুল'}</Badge></div>
              <ul className="mt-3 space-y-1.5">{r.options.map((o, i) => (
                <li key={o.id} className={cn('flex gap-2 rounded-lg px-3 py-2 text-[15px]', o.isCorrect && 'bg-emerald-50 text-emerald-900', r.selectedOptionId === o.id && !o.isCorrect && 'bg-rose-50 text-rose-900')}>
                  <b>{LETTERS[i]}.</b><RichText text={o.text} />{o.isCorrect && <span className="ml-auto">✔<span className="sr-only"> সঠিক উত্তর</span></span>}{r.selectedOptionId === o.id && !o.isCorrect && <span className="ml-auto">✘ আপনার উত্তর</span>}
                </li>))}</ul>
              {r.explanation && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><b>ব্যাখ্যা:</b> <RichText text={r.explanation} /></p>}
              <Link href={`/mcq/${r.slug}`} className="mt-2 inline-block text-sm text-brand-700 hover:underline">প্রশ্নের পেজ →</Link>
            </Card>
          ))}
          {!list.length && <p className="rounded-xl bg-white p-6 text-center text-slate-500">এই ফিল্টারে কিছু নেই।</p>}
        </div>
      </div>
    </div>
  );
}