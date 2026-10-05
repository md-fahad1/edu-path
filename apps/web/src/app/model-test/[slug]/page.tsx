import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Badge, Card, LinkButton, PageTitle } from '@/components/ui';
import { Leaderboard } from '@/components/Leaderboard';

export const revalidate = 600;
// Build-er shomoy API na lagleo hoy; page gulo prothom request-e toiri hoye ISR cache hoy
export async function generateStaticParams() { return []; }
type T = { id: string; title: string; slug: string; durationMin: number; negativeMark: number; markPerQ: number; isPremium: boolean; _count: { questions: number; attempts: number }; chapter: { name: string; slug: string; subject: { name: string; slug: string; category: { name: string; slug: string } } } | null; exam: { name: string; slug: string } | null };
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const t = await sapiOrNull<T>(`/tests/${slug}`);
  if (!t) return {};
  return { title: `${t.title} (ফ্রি)`, description: `${t.title}: ${t._count.questions}টি প্রশ্ন, ${t.durationMin} মিনিট। এখনই পরীক্ষা দিন ও ফলাফল দেখুন।`, alternates: { canonical: `/model-test/${slug}` } };
}

export default async function TestLanding({ params }: P) {
  const { slug } = await params;
  const t = await sapiOrNull<T>(`/tests/${slug}`);
  if (!t) notFound();
  const rules = [`মোট প্রশ্ন: ${bn(t._count.questions)}টি`, `সময়: ${bn(t.durationMin)} মিনিট`, `প্রতিটি সঠিক উত্তরে ${bn(t.markPerQ)} নম্বর`, `প্রতিটি ভুল উত্তরে ${bn(t.negativeMark)} নম্বর কাটা যাবে`, 'উত্তর না দিলে কোনো নম্বর কাটা হবে না', 'সময় শেষ হলে নিজে থেকে সাবমিট হবে', 'পেজ রিফ্রেশ করলেও আপনার উত্তর ও সময় ঠিক থাকবে'];
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'মডেল টেস্ট', href: '/model-test' }, { name: t.title }]} />
      <PageTitle title={t.title} right={t.isPremium ? <Badge tone="amber">👑 প্রিমিয়াম</Badge> : <Badge tone="green">ফ্রি</Badge>} />
      <Card>
        <h2 className="mb-2 font-semibold">নিয়মাবলি</h2>
        <ul className="list-inside list-disc space-y-1 text-slate-700">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="mt-3 text-sm text-slate-500">এ পর্যন্ত {bn(t._count.attempts)} বার দেওয়া হয়েছে।</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton href={`/model-test/${t.slug}/take`} size="lg" prefetch={false}>পরীক্ষা শুরু করুন →</LinkButton>
          {t.chapter && <Link className="self-center text-sm text-brand-700 hover:underline" href={`/${t.chapter.subject.category.slug}/${t.chapter.subject.slug}/${t.chapter.slug}`}>চ্যাপ্টার পড়ুন</Link>}
        </div>
      </Card>
      <h2 className="mb-3 mt-8 text-lg font-bold">🏆 লিডারবোর্ড</h2>
      <Leaderboard testId={t.id} />
    </div>
  );
}
