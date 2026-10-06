'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Card, LinkButton } from './ui';

type Summary = { total: number; due: number; mastered: number };

export function NotebookCard() {
  const { data } = useQuery({ queryKey: ['nb', 'summary'], queryFn: () => api<Summary>('/practice/notebook/summary') });
  if (!data) return null;
  const has = data.total > 0;
  return (
    <Card className="mb-4 !p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">📓 ভুলের নোটবুক</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {!has
              ? 'এখনো কোনো ভুল জমেনি। প্র্যাকটিস করুন, ভুল প্রশ্নগুলো এখানে জমা হবে।'
              : data.due > 0
                ? `আজ ${bn(data.due)}টি প্রশ্ন রিভিশনের সময় হয়েছে (মোট ${bn(data.total)}টি)।`
                : `মোট ${bn(data.total)}টি প্রশ্ন জমা আছে, আজ রিভিশন বাকি নেই 👍`}
            {data.mastered > 0 && ` শিখে ফেলেছেন ${bn(data.mastered)}টি।`}
          </p>
        </div>
        <div className="flex gap-2">
          {data.due > 0 && <LinkButton href="/practice?mode=notebook" size="sm">রিভিশন শুরু ({bn(data.due)})</LinkButton>}
          {has && <LinkButton href="/notebook" size="sm" variant="outline">নোটবুক দেখুন</LinkButton>}
          {!has && <LinkButton href="/practice?mode=smart" size="sm">স্মার্ট প্র্যাকটিস</LinkButton>}
        </div>
      </div>
    </Card>
  );
}