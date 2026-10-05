import type { Metadata } from 'next';
import Link from 'next/link';
import { sapi } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Badge, Card, PageTitle } from '@/components/ui';

export const revalidate = 600;
export const metadata: Metadata = { title: 'ফ্রি মডেল টেস্ট – এইচএসসি, বিসিএস ও ভর্তি', description: 'টাইমার ও নেগেটিভ মার্কিংসহ মডেল টেস্ট দিন, ফলাফলের সাথে ব্যাখ্যা ও র‍্যাংক দেখুন।', alternates: { canonical: '/model-test' } };
type T = { id: string; title: string; slug: string; durationMin: number; negativeMark: number; isPremium: boolean; _count: { questions: number }; chapter: { subject: { category: { name: string } } } | null };

export default async function TestsPage() {
  const tests = await sapi<T[]>('/tests', 600);
  return (
    <>
      <Breadcrumb items={[{ name: 'মডেল টেস্ট' }]} />
      <PageTitle title="মডেল টেস্ট" sub="সময় ধরে পরীক্ষা দিন, শেষে সঠিক উত্তর ও ব্যাখ্যাসহ ফলাফল দেখুন।" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((t) => (
          <Link key={t.id} href={`/model-test/${t.slug}`}>
            <Card className="h-full transition hover:border-brand-300 hover:shadow-sm">
              <div className="mb-2 flex flex-wrap gap-1.5">{t.chapter && <Badge tone="blue">{t.chapter.subject.category.name}</Badge>}{t.isPremium ? <Badge tone="amber">👑 প্রিমিয়াম</Badge> : <Badge tone="green">ফ্রি</Badge>}</div>
              <p className="font-semibold leading-snug">{t.title}</p>
              <p className="mt-2 text-sm text-slate-500">{bn(t._count.questions)} প্রশ্ন · {bn(t.durationMin)} মিনিট · নেগেটিভ {bn(t.negativeMark)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
