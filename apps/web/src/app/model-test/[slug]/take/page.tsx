import type { Metadata } from 'next';
import { TestRunner } from './TestRunner';

export const metadata: Metadata = { title: 'পরীক্ষা চলছে', robots: { index: false, follow: false } };

export default async function TakePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TestRunner slug={slug} />;
}
