'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import { toast } from '@/lib/toast';
import { bn, cn } from '@/lib/utils';
import { Button, Card, Loading } from '@/components/ui';

type Cat = { id: string; name: string; slug: string; description: string | null };
type Me = { name: string; targetCategory: string | null; dailyGoal: number; onboarded: boolean };

const ICON: Record<string, string> = { hsc: '🎓', bcs: '🏛️', admission: '🏫' };
const GOALS = [
  { v: 5, label: 'হালকা', hint: 'ব্যস্ত দিনেও সম্ভব' },
  { v: 10, label: 'নিয়মিত', hint: 'বেশিরভাগের জন্য ভালো' },
  { v: 20, label: 'সিরিয়াস', hint: 'পরীক্ষা কাছাকাছি' },
  { v: 40, label: 'ফুল প্রস্তুতি', hint: 'দিনে ১–২ ঘণ্টা' },
];

export function OnboardingClient() {
  const { allowed } = useRequireAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/users/me'), enabled: allowed });
  const cats = useQuery({ queryKey: ['cats'], queryFn: () => api<Cat[]>('/categories'), enabled: allowed });

  const [step, setStep] = useState<1 | 2>(1);
  const [cat, setCat] = useState<string | null>(null);
  const [goal, setGoal] = useState(10);
  const filled = useRef(false);

  // age thekei set kora thakle (lokkho bodlate ele) segulo bosiye dei
  useEffect(() => {
    if (me.data && !filled.current) {
      filled.current = true;
      setCat(me.data.targetCategory);
      setGoal(me.data.dailyGoal);
    }
  }, [me.data]);

  const save = useMutation({
    mutationFn: (body: object) => api('/users/me', { method: 'PATCH', json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['ov'] });
      router.replace('/dashboard');
    },
    onError: (e: any) => toast.error(e?.message || 'সেভ করা যায়নি, আবার চেষ্টা করুন'),
  });

  if (!allowed || me.isLoading || cats.isLoading) return <Loading />;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-brand-700">ধাপ {bn(step)} / {bn(2)}</p>
      <div className="mt-1 flex gap-1.5" aria-hidden>
        {[1, 2].map((n) => <span key={n} className={cn('h-1.5 flex-1 rounded-full', n <= step ? 'bg-brand-600' : 'bg-slate-200')} />)}
      </div>

      {step === 1 ? (
        <section className="mt-6">
          <h1 className="text-2xl font-bold sm:text-3xl">স্বাগতম{me.data?.name ? `, ${me.data.name.split(' ')[0]}` : ''}! 👋</h1>
          <p className="mt-1 text-slate-600">আপনি কোন পরীক্ষার প্রস্তুতি নিচ্ছেন? আমরা সেই অনুযায়ী ড্যাশবোর্ড সাজিয়ে দেব।</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {cats.data?.map((c) => (
              <button
                key={c.id} type="button" onClick={() => setCat(c.slug)} aria-pressed={cat === c.slug}
                className={cn('rounded-2xl border-2 bg-white p-5 text-left transition hover:-translate-y-0.5', cat === c.slug ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 hover:border-brand-300')}
              >
                <div className="text-3xl">{ICON[c.slug] ?? '📘'}</div>
                <p className="mt-2 text-lg font-semibold">{c.name}</p>
                {cat === c.slug && <p className="mt-1 text-sm font-medium text-brand-700">✔ নির্বাচিত</p>}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button type="button" className="text-sm text-slate-500 hover:underline" disabled={save.isPending} onClick={() => save.mutate({ skipOnboarding: true })}>পরে করব</button>
            <Button size="lg" disabled={!cat} onClick={() => setStep(2)}>পরবর্তী →</Button>
          </div>
        </section>
      ) : (
        <section className="mt-6">
          <h1 className="text-2xl font-bold sm:text-3xl">প্রতিদিন কয়টি প্রশ্ন সমাধান করবেন?</h1>
          <p className="mt-1 text-slate-600">ছোট লক্ষ্য দিয়ে শুরু করুন, নিয়মিত থাকাটাই আসল। পরে যেকোনো সময় বদলাতে পারবেন।</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button
                key={g.v} type="button" onClick={() => setGoal(g.v)} aria-pressed={goal === g.v}
                className={cn('flex items-center justify-between rounded-2xl border-2 bg-white p-4 text-left transition', goal === g.v ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 hover:border-brand-300')}
              >
                <span><span className="block font-semibold">{g.label}</span><span className="text-sm text-slate-500">{g.hint}</span></span>
                <span className="text-2xl font-bold text-brand-700">{bn(g.v)}<span className="ml-1 text-sm font-medium text-slate-500">টি</span></span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>← পিছনে</Button>
            <Button
              size="lg" disabled={save.isPending}
              onClick={() => save.mutate({ targetCategory: cat, dailyGoal: goal }, { onSuccess: () => toast.success('চমৎকার! আপনার লক্ষ্য সেট হয়েছে 🎯') })}
            >{save.isPending ? 'সেভ হচ্ছে…' : 'শুরু করি 🚀'}</Button>
          </div>
        </section>
      )}
    </div>
  );
}