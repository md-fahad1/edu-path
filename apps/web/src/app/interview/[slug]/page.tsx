import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sapiOrNull } from '@/lib/api';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageTitle } from '@/components/ui';
import { InterviewClient, type IvQ } from './InterviewClient';

export const revalidate = 300;
type Cat = { id: string; slug: string; name: string; description: string | null; icon: string | null; questions: IvQ[] };
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await sapiOrNull<Cat>(`/interview/categories/${slug}`);
  if (!c) return {};
  return {
    title: `${c.name} – ইন্টারভিউ প্রশ্ন ও উত্তর`,
    description: c.description || `${c.name}-এর সম্ভাব্য ইন্টারভিউ প্রশ্ন, নমুনা উত্তর ও টিপস।`,
    alternates: { canonical: `/interview/${slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const c = await sapiOrNull<Cat>(`/interview/categories/${slug}`);
  if (!c) notFound();
  return (
    <>
      <Breadcrumb items={[{ name: 'ইন্টারভিউ', href: '/interview' }, { name: c.name }]} />
      <PageTitle title={`${c.icon || '🎤'} ${c.name}`} sub={c.description || undefined} />
      <InterviewClient questions={c.questions} />
    </>
  );
}