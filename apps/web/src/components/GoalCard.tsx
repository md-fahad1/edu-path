'use client';
import Link from 'next/link';
import { Card, LinkButton, Progress } from './ui';
import { bn } from '@/lib/utils';

export function GoalCard({ solved, goal }: { solved: number; goal: number }) {
  const done = solved >= goal;
  const pct = Math.min(100, Math.round((solved / goal) * 100));
  return (
    <Card className="mb-4 !p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">🎯 আজকের লক্ষ্য</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {done ? '🎉 অসাধারণ! আজকের লক্ষ্য পূরণ হয়েছে। আরও করলে বাড়তি লাভ।' : `আর ${bn(goal - solved)}টি প্রশ্ন সমাধান করলেই আজকের লক্ষ্য পূরণ।`}
          </p>
        </div>
        <LinkButton href="/practice" size="sm" variant={done ? 'outline' : 'primary'}>{done ? 'আরও প্র্যাকটিস' : 'প্র্যাকটিস শুরু করুন'}</LinkButton>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1"><Progress value={pct} tone={done ? 'green' : 'brand'} /></div>
        <span className="shrink-0 text-sm font-semibold">{bn(Math.min(solved, 9999))}/{bn(goal)}</span>
      </div>
      <Link href="/onboarding" className="mt-2 inline-block text-xs text-slate-500 hover:text-brand-700 hover:underline">লক্ষ্য বা পরীক্ষা বদলান</Link>
    </Card>
  );
}