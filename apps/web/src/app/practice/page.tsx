import type { Metadata } from 'next';
import { sapi } from '@/lib/api';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageTitle } from '@/components/ui';
import { PracticeClient, type Tree } from './PracticeClient';
import { Suspense } from 'react';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'প্র্যাকটিস মোড – একটি একটি করে MCQ', description: 'চ্যাপ্টার বা টপিক বেছে নিয়ে একটি একটি করে MCQ সমাধান করুন, সাথে সাথে উত্তর ও ব্যাখ্যা দেখুন।', alternates: { canonical: '/practice' } };

export default async function PracticePage() {
  const tree = await sapi<Tree>('/catalog/tree', 3600);
  return (
    <>
      <Breadcrumb items={[{ name: 'প্র্যাকটিস' }]} />
      <PageTitle title="প্র্যাকটিস মোড" sub="টাইমার নেই, চাপ নেই – উত্তর দিলেই সাথে সাথে ব্যাখ্যা। লগইন করলে দুর্বল টপিক ট্র্যাক হবে।" />
      <Suspense><PracticeClient tree={tree} /></Suspense>
    </>
  );
}
