import type { Metadata } from 'next';
import { sapi } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageTitle } from '@/components/ui';
import { PlanCards } from './PlanCards';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'প্রিমিয়াম প্ল্যান', description: 'সব প্রিমিয়াম মডেল টেস্ট, সম্পূর্ণ দুর্বল-টপিক বিশ্লেষণ ও বিজ্ঞাপনমুক্ত অভিজ্ঞতা।', alternates: { canonical: '/pricing' } };
export type Plan = { id: string; name: string; priceBdt: number; durationDays: number; features: string[] | null };

export default async function PricingPage() {
  const plans = await sapi<Plan[]>('/plans', 3600);
  return (
    <>
      <Breadcrumb items={[{ name: 'প্রিমিয়াম' }]} />
      <PageTitle title="প্রিমিয়াম প্ল্যান" sub="প্রশ্ন, উত্তর ও ব্যাখ্যা সবসময় ফ্রি। প্রিমিয়ামে পাবেন বাড়তি সুবিধা।" />
      <div className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div><p className="mb-2 font-semibold text-slate-900">ফ্রি</p><ul className="space-y-1 text-slate-700"><li>✓ সব প্রশ্ন, উত্তর ও ব্যাখ্যা</li><li>✓ চ্যাপ্টারভিত্তিক প্র্যাকটিস</li><li>✓ ফ্রি মডেল টেস্ট ও ফলাফল রিভিউ</li><li>✓ বেসিক ড্যাশবোর্ড</li></ul></div>
        <div><p className="mb-2 font-semibold text-amber-700">👑 প্রিমিয়াম</p><ul className="space-y-1 text-slate-700"><li>✓ সব প্রিমিয়াম মডেল টেস্ট ও মক টেস্ট</li><li>✓ সম্পূর্ণ দুর্বল-টপিক বিশ্লেষণ</li><li>✓ বিজ্ঞাপনমুক্ত</li><li>✓ প্রতিটি টেস্টে র‍্যাংক ও তুলনা</li></ul></div>
      </div>
      <PlanCards plans={plans.map((p) => ({ ...p, features: p.features ?? [] }))} />
      <p className="mt-6 text-center text-sm text-slate-500">{bn(plans.length)}টি প্ল্যান · মেয়াদ শেষে স্বয়ংক্রিয়ভাবে বন্ধ হয়, কোনো অটো-ডেবিট নেই।</p>
    </>
  );
}
