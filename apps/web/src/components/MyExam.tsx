'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Card } from './ui';

type CatData = {
  category: { name: string; slug: string };
  subjects: { id: string; name: string; slug: string; chapterCount: number; questionCount: number }[];
};

/** Dashboard-e user-er nijer exam-er bishoy gulo shobar age */
export function MyExam({ slug }: { slug: string }) {
  const { data } = useQuery({ queryKey: ['cat', slug], queryFn: () => api<CatData>(`/catalog/${slug}`) });
  if (!data?.subjects.length) return null;
  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">📖 আপনার পরীক্ষা: {data.category.name}</h2>
        <Link href={`/${slug}`} className="text-sm text-brand-700 hover:underline">সব দেখুন →</Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.subjects.map((s) => (
          <Link key={s.id} href={`/${slug}/${s.slug}`} className="rounded-xl border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50/50">
            <p className="font-medium leading-snug">{s.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{bn(s.chapterCount)}টি চ্যাপ্টার · {bn(s.questionCount)}টি MCQ</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}