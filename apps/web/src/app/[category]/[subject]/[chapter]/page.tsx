import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { bn } from '@/lib/utils';
import type { Paged, Question } from '@/lib/types';
import { Breadcrumb } from '@/components/Breadcrumb';
import { QuestionCard } from '@/components/QuestionCard';
import { Badge, Card, LinkButton, PageTitle } from '@/components/ui';

export const revalidate = 21600;
type Data = {
  category: { name: string; slug: string }; subject: { name: string; slug: string };
  chapter: { id: string; name: string; summary: string | null; questionCount: number; isPremium: boolean };
  topics: { id: string; name: string; questionCount: number }[];
  tests: { id: string; title: string; slug: string; durationMin: number; isPremium: boolean; _count: { questions: number } }[];
};
type P = { params: Promise<{ category: string; subject: string; chapter: string }>; searchParams: Promise<{ page?: string }> };
const PAGE = 20;

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { category, subject, chapter } = await params;
  const { page } = await searchParams;
  const d = await sapiOrNull<Data>(`/catalog/${category}/${subject}/${chapter}`);
  if (!d) return {};
  const base = `/${category}/${subject}/${chapter}`;
  return {
    title: `${d.category.name} ${d.subject.name} ${d.chapter.name} MCQ ও নোট${page && page !== '1' ? ` (পৃষ্ঠা ${page})` : ''}`,
    description: (d.chapter.summary ?? `${d.chapter.name}-এর MCQ, উত্তর ও ব্যাখ্যা।`).slice(0, 155),
    alternates: { canonical: page && page !== '1' ? `${base}?page=${page}` : base },
  };
}

export default async function ChapterPage({ params, searchParams }: P) {
  const { category, subject, chapter } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const d = await sapiOrNull<Data>(`/catalog/${category}/${subject}/${chapter}`);
  if (!d) notFound();
  const qs = await sapiOrNull<Paged<Question>>(`/questions?chapterId=${d.chapter.id}&page=${page}&limit=${PAGE}`, 1800);
  const base = `/${category}/${subject}/${chapter}`;
  const faq = [
    { q: `${d.chapter.name} থেকে কতটি MCQ আছে?`, a: `এই চ্যাপ্টারে বর্তমানে ${bn(d.chapter.questionCount)}টি যাচাই-করা MCQ আছে, প্রতিটির সঠিক উত্তর ও ব্যাখ্যাসহ।` },
    { q: 'MCQ প্র্যাকটিস কি ফ্রি?', a: 'হ্যাঁ, প্রশ্ন, উত্তর ও ব্যাখ্যা সবসময় ফ্রি। শুধু কিছু প্রিমিয়াম মডেল টেস্ট ও বিস্তারিত অ্যানালিটিক্স সাবস্ক্রিপশনের আওতায়।' },
  ];
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <>
      <Breadcrumb items={[{ name: d.category.name, href: `/${category}` }, { name: d.subject.name, href: `/${category}/${subject}` }, { name: d.chapter.name }]} />
      <PageTitle title={d.chapter.name} sub={`${d.category.name} · ${d.subject.name}`} />
      {d.chapter.summary && <Card className="mb-5 prose-bn"><h2 className="mb-1 font-semibold">সারসংক্ষেপ</h2><p className="text-slate-700">{d.chapter.summary}</p></Card>}

      <div className="mb-6 flex flex-wrap gap-3">
        <LinkButton href={`/practice?chapterId=${d.chapter.id}`} size="lg">⚡ প্র্যাকটিস মোড</LinkButton>
        {d.tests[0] && <LinkButton href={`/model-test/${d.tests[0].slug}`} variant="outline" size="lg">📝 মডেল টেস্ট দিন</LinkButton>}
      </div>

      {d.topics.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {d.topics.map((t) => <Badge key={t.id} tone="blue" className="!px-3 !py-1 !text-sm">{t.name} ({bn(t.questionCount)})</Badge>)}
        </div>
      )}

      <h2 className="mb-3 text-xl font-bold">MCQ ও উত্তর ({bn(d.chapter.questionCount)})</h2>
      {qs && qs.items.length ? (
        <div className="space-y-4">
          {qs.items.map((q, i) => <QuestionCard key={q.id} q={q} no={(page - 1) * PAGE + i + 1} />)}
        </div>
      ) : <p className="rounded-xl bg-white p-6 text-center text-slate-500">এই চ্যাপ্টারে এখনো কোনো প্রশ্ন প্রকাশিত হয়নি।</p>}

      {qs && qs.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="পৃষ্ঠা">
          {page > 1 ? <Link className="rounded-xl border bg-white px-4 py-2.5 font-medium hover:bg-slate-50" href={page === 2 ? base : `${base}?page=${page - 1}`}>← আগের</Link> : <span />}
          <span className="text-sm text-slate-500">{bn(page)} / {bn(qs.totalPages)}</span>
          {page < qs.totalPages ? <Link className="rounded-xl border bg-white px-4 py-2.5 font-medium hover:bg-slate-50" href={`${base}?page=${page + 1}`}>পরের →</Link> : <span />}
        </nav>
      )}

      {d.tests.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-bold">এই চ্যাপ্টারের মডেল টেস্ট</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.tests.map((t) => (
              <Card key={t.id}><Link href={`/model-test/${t.slug}`} className="font-semibold text-brand-700 hover:underline">{t.title}</Link><p className="mt-1 text-sm text-slate-500">{bn(t._count.questions)} প্রশ্ন · {bn(t.durationMin)} মিনিট {t.isPremium && '· 👑 প্রিমিয়াম'}</p></Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">সাধারণ প্রশ্ন (FAQ)</h2>
        <div className="space-y-2">{faq.map((f) => <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 text-slate-600">{f.a}</p></details>)}</div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
