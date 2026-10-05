import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Badge, PageTitle } from '@/components/ui';

export const revalidate = 3600;
// Build-er shomoy API na lagleo hoy; page gulo prothom request-e toiri hoye ISR cache hoy
export async function generateStaticParams() { return []; }
type Data = { category: { name: string; slug: string }; subject: { name: string }; chapters: { id: string; name: string; slug: string; isPremium: boolean; summary: string | null; questionCount: number; topicCount: number }[] };
type P = { params: Promise<{ category: string; subject: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { category, subject } = await params;
  const d = await sapiOrNull<Data>(`/catalog/${category}/${subject}`);
  if (!d) return {};
  return { title: `${d.category.name} ${d.subject.name}: সব চ্যাপ্টারের MCQ`, description: `${d.category.name} ${d.subject.name}-এর ${d.chapters.length}টি চ্যাপ্টারের MCQ, উত্তর ও ব্যাখ্যা।`, alternates: { canonical: `/${category}/${subject}` } };
}

export default async function SubjectPage({ params }: P) {
  const { category, subject } = await params;
  const d = await sapiOrNull<Data>(`/catalog/${category}/${subject}`);
  if (!d) notFound();
  return (
    <>
      <Breadcrumb items={[{ name: d.category.name, href: `/${category}` }, { name: d.subject.name }]} />
      <PageTitle title={`${d.category.name}: ${d.subject.name}`} sub="চ্যাপ্টার বেছে নিয়ে MCQ প্র্যাকটিস করুন বা মডেল টেস্ট দিন।" />
      <div className="grid gap-3">
        {d.chapters.map((c, i) => (
          <Link key={c.id} href={`/${category}/${subject}/${c.slug}`} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700">{bn(i + 1)}</span>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{c.name} {c.isPremium && <Badge tone="amber">প্রিমিয়াম</Badge>}</p>
              {c.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.summary}</p>}
              <p className="mt-1.5 text-sm text-slate-500">{bn(c.questionCount)}টি MCQ · {bn(c.topicCount)}টি টপিক</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
