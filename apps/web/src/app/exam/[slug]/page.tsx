import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { bn } from '@/lib/utils';
import type { Question } from '@/lib/types';
import { Breadcrumb } from '@/components/Breadcrumb';
import { QuestionCard } from '@/components/QuestionCard';
import { Badge, Card, PageTitle } from '@/components/ui';

export const revalidate = 3600;
// Build-er shomoy API na lagleo hoy; page gulo prothom request-e toiri hoye ISR cache hoy
export async function generateStaticParams() { return []; }
type Exam = { id: string; name: string; slug: string; year: number; conductor: string | null; answerKeyOfficial: boolean; category: { name: string; slug: string }; tests: { id: string; title: string; slug: string; durationMin: number; isPremium: boolean }[]; questions: (Question & { chapter: { name: string; subject: { name: string } } })[] };
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const e = await sapiOrNull<Exam>(`/exams/${slug}`);
  if (!e) return {};
  return { title: `${e.name} প্রশ্ন ও সমাধান`, description: `${e.name}-এর সব MCQ, সঠিক উত্তর ও ব্যাখ্যা – বিষয়ভিত্তিক সাজানো।`, alternates: { canonical: `/exam/${slug}` } };
}

export default async function ExamPage({ params }: P) {
  const { slug } = await params;
  const e = await sapiOrNull<Exam>(`/exams/${slug}`);
  if (!e) notFound();
  const bySubject = new Map<string, number>();
  e.questions.forEach((q) => bySubject.set(q.chapter.subject.name, (bySubject.get(q.chapter.subject.name) ?? 0) + 1));
  return (
    <>
      <Breadcrumb items={[{ name: e.category.name, href: `/${e.category.slug}` }, { name: e.name }]} />
      <PageTitle title={`${e.name} – প্রশ্ন ও সমাধান`} sub={`${bn(e.year)}${e.conductor ? ` · ${e.conductor}` : ''}`} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={e.answerKeyOfficial ? 'green' : 'amber'}>{e.answerKeyOfficial ? 'অফিসিয়াল উত্তরমালা' : 'নমুনা/অনানুষ্ঠানিক উত্তর'}</Badge>
        {[...bySubject].map(([s, n]) => <Badge key={s} tone="blue">{s}: {bn(n)}</Badge>)}
      </div>
      {e.tests.length > 0 && <Card className="mb-5"><p className="mb-2 font-semibold">এই পরীক্ষার টেস্ট দিন</p>{e.tests.map((t) => <Link key={t.id} href={`/model-test/${t.slug}`} className="mr-4 text-brand-700 hover:underline">{t.title}{t.isPremium && ' 👑'}</Link>)}</Card>}
      <div className="space-y-4">{e.questions.map((q, i) => <QuestionCard key={q.id} q={q} no={i + 1} />)}</div>
    </>
  );
}
