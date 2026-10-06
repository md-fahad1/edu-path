'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import { RichText } from '@/components/RichText';
import { announceGame, type Game } from '@/lib/game';
import { toast } from '@/lib/toast';
import { bn, cn } from '@/lib/utils';
import { Button, Card, Empty, ErrorBox, LinkButton, Loading, PageTitle, Progress } from '@/components/ui';

type Q = { id: string; text: string; difficulty: string; topic: { name: string } | null; options: { id: string; label: string; text: string }[] };
type Res = { optionId: string; isCorrect: boolean; correctOptionId: string | null; explanation: string | null };
type Today = { date: string; total: number; answered: number; correct: number; done: boolean; questions: Q[]; results: Record<string, Res> };
type Bonus = { xp: number; streak: number; perfect: boolean };
type Answer = Res & { done: boolean; bonus: Bonus | null; game: NonNullable<Game> };

export function ChallengeClient() {
  const { allowed } = useRequireAuth();
  const qc = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ['challenge'], queryFn: () => api<Today>('/challenge/today'), enabled: allowed, staleTime: Infinity,
  });
  const [local, setLocal] = useState<Record<string, Res>>({});
  const [idx, setIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [bonus, setBonus] = useState<Bonus | null>(null);
  const [gained, setGained] = useState(0);

  if (!allowed) return <Loading />;
  if (error) return <ErrorBox message={(error as Error).message} />;
  if (!data) return <Loading />;
  if (!data.total) {
    return <Empty title="আজকের চ্যালেঞ্জ এখনো তৈরি হয়নি" hint="প্রশ্ন যোগ হলে আবার দেখুন" action={<LinkButton href="/practice">প্র্যাকটিস করুন</LinkButton>} />;
  }

  const results = { ...data.results, ...local };
  const answered = Object.keys(results).length;
  const firstOpen = data.questions.findIndex((q) => !results[q.id]);
  const cur = idx ?? (firstOpen === -1 ? data.total : firstOpen);
  const finished = answered >= data.total && cur >= data.total;

  async function pick(q: Q, optionId: string) {
    if (busy || results[q.id]) return;
    setBusy(true);
    try {
      const r = await api<Answer>('/challenge/answer', { method: 'POST', json: { questionId: q.id, optionId } });
      setLocal((p) => ({ ...p, [q.id]: { optionId, isCorrect: r.isCorrect, correctOptionId: r.correctOptionId, explanation: r.explanation } }));
      setIdx(data!.questions.findIndex((x) => x.id === q.id));
      setGained((g) => g + (r.game?.xp ?? 0));
      if (r.bonus) setBonus(r.bonus);
      announceGame(r.game);
      if (r.done) ['game', 'challenge-status', 'ov', 'weekly'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error((e as Error).message);
      if (e instanceof ApiError && e.status === 409) qc.invalidateQueries({ queryKey: ['challenge'] });
    } finally {
      setBusy(false);
    }
  }

  // ---------- ফলাফল ----------
  if (finished) {
    const correct = data.questions.filter((q) => results[q.id]?.isCorrect).length;
    const pct = Math.round((correct / data.total) * 100);
    return (
      <>
        <PageTitle title="🎯 ডেইলি চ্যালেঞ্জ" sub="আজকের ফলাফল" />
        <Card className="text-center">
          <p className="text-5xl font-bold text-brand-700">{bn(correct)}/{bn(data.total)}</p>
          <p className="mt-2 font-medium">{pct === 100 ? '🎉 অসাধারণ! সবগুলো ঠিক!' : pct >= 70 ? '👏 দারুণ করেছেন!' : pct >= 40 ? '👍 ভালো চেষ্টা, কাল আরও ভালো হবে' : '💪 ভুলগুলো নোটবুকে জমা হয়েছে, ওগুলো থেকেই শেখা'}</p>
          {gained > 0 && <p className="mt-3 text-lg font-semibold text-emerald-600">+{bn(gained)} XP</p>}
          {bonus && (
            <p className="mt-1 text-sm text-slate-500">
              চ্যালেঞ্জ বোনাস +{bn(bonus.xp)} XP{bonus.perfect ? ' (শতভাগ সঠিক 💯)' : ''}{bonus.streak > 1 ? ` · 🔥 ${bn(bonus.streak)} দিনের streak` : ''}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <LinkButton href="/leaderboard">🏆 লিডারবোর্ড</LinkButton>
            <LinkButton href="/notebook" variant="outline">📓 নোটবুক</LinkButton>
            <LinkButton href="/practice?mode=smart" variant="outline">স্মার্ট প্র্যাকটিস</LinkButton>
          </div>
        </Card>

        <h2 className="mb-2 mt-6 font-semibold">প্রশ্নগুলো একনজরে</h2>
        <ul className="space-y-2">
          {data.questions.map((q, i) => {
            const r = results[q.id];
            return (
              <Card key={q.id} className="!p-3">
                <div className="flex gap-2 text-[15px]">
                  <span aria-hidden>{r?.isCorrect ? '✅' : '❌'}</span>
                  <span className="sr-only">{r?.isCorrect ? 'সঠিক' : 'ভুল'}</span>
                  <span className="min-w-0 flex-1"><b>{bn(i + 1)}.</b> <RichText text={q.text} /></span>
                </div>
              </Card>
            );
          })}
        </ul>
      </>
    );
  }

  // ---------- প্রশ্ন ----------
  const q = data.questions[cur];
  const r = results[q.id];
  const isLast = cur === data.total - 1;

  return (
    <>
      <PageTitle title="🎯 ডেইলি চ্যালেঞ্জ" sub={`প্রশ্ন ${bn(cur + 1)}/${bn(data.total)}`} />
      <div className="mb-4"><Progress value={Math.round((answered / data.total) * 100)} /></div>

      <Card>
        {q.topic && <p className="mb-2 text-xs text-slate-500">{q.topic.name}</p>}
        <div className="text-[17px] font-medium leading-relaxed"><RichText text={q.text} /></div>

        <div className="mt-4 space-y-2" role="group" aria-label="অপশন">
          {q.options.map((o) => {
            const state = !r ? 'idle' : o.id === r.correctOptionId ? 'right' : o.id === r.optionId ? 'wrong' : 'dim';
            return (
              <button
                key={o.id}
                onClick={() => pick(q, o.id)}
                disabled={busy || !!r}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-[15px] transition',
                  state === 'idle' && 'border-slate-200 bg-white hover:border-brand-500',
                  state === 'right' && 'border-emerald-500 bg-emerald-50',
                  state === 'wrong' && 'border-rose-500 bg-rose-50',
                  state === 'dim' && 'border-slate-200 opacity-60',
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">{o.label}</span>
                <span className="min-w-0 flex-1"><RichText text={o.text} /></span>
                {state === 'right' && <span className="sr-only">(সঠিক উত্তর)</span>}
                {state === 'wrong' && <span className="sr-only">(আপনার ভুল উত্তর)</span>}
              </button>
            );
          })}
        </div>

        {r && (
          <div className="mt-4" aria-live="polite">
            <p className={cn('font-semibold', r.isCorrect ? 'text-emerald-600' : 'text-rose-600')}>{r.isCorrect ? '✅ সঠিক!' : '❌ ভুল — নোটবুকে যোগ হয়েছে'}</p>
            {r.explanation && (
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed">
                <b>ব্যাখ্যা: </b><RichText text={r.explanation} />
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setIdx(cur + 1)}>{isLast ? 'ফলাফল দেখুন →' : 'পরের প্রশ্ন →'}</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}