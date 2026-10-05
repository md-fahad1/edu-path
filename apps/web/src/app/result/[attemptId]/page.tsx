import type { Metadata } from 'next';
import { ResultClient } from './ResultClient';

export const metadata: Metadata = { title: 'ফলাফল', robots: { index: false, follow: false } };

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <ResultClient id={attemptId} />;
}
