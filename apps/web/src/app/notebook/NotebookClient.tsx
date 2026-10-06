'use client';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import { toast } from '@/lib/toast';
import { bn, cn } from '@/lib/utils';
import type { Question } from '@/lib/types';
import { QuestionCard } from '@/components/QuestionCard';
import { Badge, Button, Card, Empty, ErrorState, LinkButton, Loading, PageTitle, QuestionSkeleton, Stat } from '@/components/ui';

type Summary = { total: number; due: number; mastered: number; chapters: { chapterId: string; chapter: string; count: number; due: number }[] };
type Item = Question & { chapter: { name: string }; wrongCount: number; attempts: number; nextReviewAt: string | null; due: boolean };
type List = { items: Item[]; total: number; page: number; totalPages: number };

function when(n: string | null, due: boolean) {
  if (due || !n) return 'আজই রিভিশনের সময়';
  const d = Math.max(1, Math.ceil((new Date(n).getTime() - Date.now()) / 86_400_000));
  return `${bn(d)} দিন পরে রিভিশন`;
}

export function NotebookClient() {
  const { allowed } = useRequireAuth();
  const qc = useQueryClient();
  const [chapterId, setChapterId] = useState('');
  const [page, setPage] = useState(1);

  const sum = useQuery({ queryKey: ['nb', 'summary'], queryFn: () => api<Summary>('/practice/notebook/summary'), enabled: allowed });
  const list = useQuery({
    queryKey: ['nb', 'list', chapterId, page],
    queryFn: () => api<List>(`/practice/notebook?page=${page}${chapterId ? `&chapterId=${chapterId}` : ''}`),
    enabled: allowed, placeholderData: keepPreviousData,
  });
  const master = useMutation({
    mutationFn: (id: string) => api(`/practice/notebook/${id}/master`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nb'] }); toast.success('নোটবুক থেকে সরানো হয়েছে 🎉'); },
    onError: (e: any) => toast.error(e?.message || 'সরানো যায়নি'),
  });

  if (!allowed) return <Loading />;
  const s = sum.data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="📓 আমার ভুলের নোটবুক"
        sub="যে প্রশ্নে ভুল করেছেন সেগুলো এখানে জমা হয়। ঠিক সময়ে আবার সমাধান করলেই মনে থাকবে।"
        right={s && s.total > 0 ? <LinkButton href="/practice?mode=notebook">▶ রিভিশন শুরু করুন</LinkButton> : undefined}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="নোটবুকে" value={bn(s?.total ?? 0)} />
        <Stat label="আজ রিভিশন" value={<span className={s && s.due > 0 ? 'text-amber-600' : ''}>{bn(s?.due ?? 0)}</span>} />
        <Stat label="শিখে ফেলেছি" value={<span className="text-emerald-600">{bn(s?.mastered ?? 0)}</span>} />
      </div>

      <Card className="mt-4 !bg-brand-50 text-sm">
        <b>কীভাবে কাজ করে?</b> ভুল করলে প্রশ্নটি ১ দিন পরে আবার আসে। ঠিক করলে ৩ দিন পরে, আবার ঠিক করলে ৭ দিন পরে। তিনবার ঠিক হলে প্রশ্নটি নোটবুক থেকে বিদায় নেয়।
      </Card>

      {s && s.chapters.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="চ্যাপ্টার ফিল্টার">
          <button type="button" aria-pressed={!chapterId} onClick={() => { setChapterId(''); setPage(1); }} className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium', !chapterId ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200')}>সব ({bn(s.total)})</button>
          {s.chapters.map((c) => (
            <button key={c.chapterId} type="button" aria-pressed={chapterId === c.chapterId} onClick={() => { setChapterId(c.chapterId); setPage(1); }} className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium', chapterId === c.chapterId ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200')}>
              {c.chapter} ({bn(c.count)}){c.due > 0 && ' 🔔'}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {list.isLoading ? <QuestionSkeleton count={3} />
          : list.isError ? <ErrorState onRetry={() => list.refetch()} />
          : list.data?.items.length ? (
            <div className="space-y-5">
              {list.data.items.map((q) => (
                <div key={q.id}>
                  <QuestionCard q={q} />
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
                    <p className="text-slate-500">ভুল {bn(q.wrongCount)} বার · <Badge tone={q.due ? 'amber' : 'slate'}>{when(q.nextReviewAt, q.due)}</Badge></p>
                    <Button size="sm" variant="ghost" disabled={master.isPending} onClick={() => master.mutate(q.id)}>✔ শিখে ফেলেছি</Button>
                  </div>
                </div>
              ))}
              {list.data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← আগের</Button>
                  <span className="text-sm text-slate-500">{bn(page)} / {bn(list.data.totalPages)}</span>
                  <Button variant="outline" disabled={page >= list.data.totalPages} onClick={() => setPage((p) => p + 1)}>পরের →</Button>
                </div>
              )}
            </div>
          ) : (
            <Empty title="নোটবুক এখন খালি 🎉" hint="প্র্যাকটিস বা টেস্টে ভুল করা প্রশ্নগুলো এখানে নিজে থেকে জমা হবে।" action={<LinkButton href="/practice?mode=smart">স্মার্ট প্র্যাকটিস শুরু করুন</LinkButton>} />
          )}
      </div>
    </div>
  );
}