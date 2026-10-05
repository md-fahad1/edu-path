import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { LETTERS, trunc } from '@/lib/utils';
import { plain } from '@/lib/rich';
import { SITE } from '@/lib/utils';
import { ShareButtons } from '@/components/ShareButtons';
import type { Option } from '@/lib/types';
import { Breadcrumb } from '@/components/Breadcrumb';
import { QuestionCard } from '@/components/QuestionCard';
import { Card, LinkButton } from '@/components/ui';

export const revalidate = 86400;
// Build-er shomoy API na lagleo hoy; page gulo prothom request-e toiri hoye ISR cache hoy
export async function generateStaticParams() { return []; }
type Q = {
  id: string; slug: string; text: string; explanation: string | null; difficulty: string; source: string | null; year: number | null; updatedAt: string; reviewedBy: string | null; reviewedAt: string | null;
  options: Option[]; topic: { id: string; name: string } | null;
  chapter: { id: string; name: string; slug: string; subject: { name: string; slug: string; category: { name: string; slug: string } } };
};
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const q = await sapiOrNull<Q>(`/questions/${slug}`, 86400);
  if (!q) return {};
  const right = q.options.find((o) => o.isCorrect);
  return {
    title: `${trunc(plain(q.text), 60)} | MCQ উত্তর ও ব্যাখ্যা`,
    description: `উত্তর: ${plain(right?.text)}। ${trunc(plain(q.explanation ?? q.text), 130)}`,
    alternates: { canonical: `/mcq/${q.slug}` },
    // explanation chhara question thin content, tai noindex
    robots: q.explanation ? undefined : { index: false, follow: true },
  };
}

export default async function McqPage({ params }: P) {
  const { slug } = await params;
  const [q, related] = await Promise.all([sapiOrNull<Q>(`/questions/${slug}`, 86400), sapiOrNull<{ id: string; slug: string; text: string }[]>(`/questions/${slug}/related`, 86400)]);
  if (!q) notFound();
  const right = q.options.find((o) => o.isCorrect);
  const c = q.chapter;
  const base = `/${c.subject.category.slug}/${c.subject.slug}/${c.slug}`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Question', name: plain(q.text),
    acceptedAnswer: { '@type': 'Answer', text: `${LETTERS[q.options.findIndex((o) => o.isCorrect)]}. ${plain(right?.text)}${q.explanation ? ` – ${plain(q.explanation)}` : ''}` },
  };
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: c.subject.category.name, href: `/${c.subject.category.slug}` }, { name: c.subject.name, href: `/${c.subject.category.slug}/${c.subject.slug}` }, { name: c.name, href: base }, { name: 'MCQ' }]} />
      <QuestionCard q={q} link={false} />
      <p className="mt-3 text-xs text-slate-500">{q.reviewedBy ? `রিভিউ করেছেন: ${q.reviewedBy} · ` : ''}সর্বশেষ হালনাগাদ: {new Date(q.updatedAt).toLocaleDateString('bn-BD')}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <LinkButton href={`/practice?chapterId=${c.id}`}>এই চ্যাপ্টারে প্র্যাকটিস</LinkButton>
        <LinkButton href={base} variant="outline">চ্যাপ্টারের সব MCQ</LinkButton>
        <div className="mt-1 w-full">
          <p className="mb-2 text-sm font-medium text-slate-600">বন্ধুদের সাথে শেয়ার করুন</p>
          <ShareButtons url={`${SITE}/mcq/${q.slug}`} title={plain(q.text)} text={`এই MCQ টা পারবে? ${plain(q.text)}`} />
        </div>
      </div>
      {related && related.length > 0 && (
        <Card className="mt-8">
          <h2 className="mb-2 font-semibold">সম্পর্কিত প্রশ্ন</h2>
          <ul className="space-y-1.5">{related.map((r) => <li key={r.id}><Link href={`/mcq/${r.slug}`} className="text-brand-700 hover:underline">{trunc(plain(r.text), 100)}</Link></li>)}</ul>
        </Card>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
