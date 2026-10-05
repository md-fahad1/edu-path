import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, PageTitle } from '@/components/ui';

export const revalidate = 3600;
// Build-er shomoy API na lagleo hoy; page gulo prothom request-e toiri hoye ISR cache hoy
export async function generateStaticParams() { return []; }
type Data = { category: { id: string; name: string; slug: string; description: string | null }; subjects: { id: string; name: string; slug: string; chapterCount: number; questionCount: number }[]; exams: { id: string; name: string; slug: string; year: number; conductor: string | null; _count: { questions: number } }[] };

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const d = await sapiOrNull<Data>(`/catalog/${category}`);
  if (!d) return {};
  return { title: `${d.category.name} – বিষয়ভিত্তিক MCQ ও মডেল টেস্ট`, description: d.category.description ?? undefined, alternates: { canonical: `/${category}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const d = await sapiOrNull<Data>(`/catalog/${category}`);
  if (!d) notFound();
  return (
    <>
      <Breadcrumb items={[{ name: d.category.name }]} />
      <PageTitle title={`${d.category.name}: সব বিষয়ের MCQ`} sub={d.category.description ?? undefined} />
      <h2 className="mb-3 text-lg font-semibold">বিষয়সমূহ</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {d.subjects.map((s) => (
          <Link key={s.id} href={`/${category}/${s.slug}`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm">
            <p className="font-semibold">{s.name}</p>
            <p className="mt-1 text-sm text-slate-500">{bn(s.chapterCount)}টি চ্যাপ্টার · {bn(s.questionCount)}টি MCQ</p>
          </Link>
        ))}
      </div>
      {d.exams.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">পরীক্ষাভিত্তিক প্রশ্ন (সেট/সাল)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.exams.map((e) => (
              <Card key={e.id}>
                <Link href={`/exam/${e.slug}`} className="font-semibold text-brand-700 hover:underline">{e.name}</Link>
                <p className="mt-1 text-sm text-slate-500">{bn(e.year)}{e.conductor ? ` · ${e.conductor}` : ''} · {bn(e._count.questions)}টি প্রশ্ন</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
