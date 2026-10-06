import type { Metadata } from 'next';
import Link from 'next/link';
import { sapi } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, Empty, PageTitle } from '@/components/ui';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'ইন্টারভিউ প্রশ্ন ও উত্তর – বিসিএস ভাইভা, চাকরি, ভর্তি',
  description: 'বিসিএস ভাইভা, চাকরির ইন্টারভিউ ও ভর্তি ভাইভার সম্ভাব্য প্রশ্ন, নমুনা উত্তর ও টিপস – ফ্ল্যাশকার্ডে অনুশীলন করুন।',
  alternates: { canonical: '/interview' },
};

type Cat = { id: string; slug: string; name: string; description: string | null; icon: string | null; count: number };

export default async function Page() {
  const cats = await sapi<Cat[]>('/interview/categories', 300).catch(() => [] as Cat[]);
  return (
    <>
      <Breadcrumb items={[{ name: 'ইন্টারভিউ' }]} />
      <PageTitle title="🎤 ইন্টারভিউ প্রস্তুতি" sub="সম্ভাব্য প্রশ্ন, নমুনা উত্তর ও টিপস – ফ্ল্যাশকার্ডে অনুশীলন করে নিজেকে তৈরি করুন।" />
      {cats.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <Link key={c.id} href={`/interview/${c.slug}`}>
              <Card className="h-full transition hover:border-brand-300 hover:shadow-sm">
                <p className="text-3xl" aria-hidden>{c.icon || '🎤'}</p>
                <p className="mt-2 font-semibold leading-snug">{c.name}</p>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
                <p className="mt-3 text-sm font-medium text-brand-700">{bn(c.count)}টি প্রশ্ন →</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="ইন্টারভিউ প্রশ্ন শীঘ্রই আসছে" hint="আমরা প্রশ্ন যোগ করছি, একটু পরে আবার দেখুন।" />
      )}
    </>
  );
}