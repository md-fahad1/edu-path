'use client';
import { PageTitle } from '@/components/ui';
import { QuestionEditor, blankQ } from '@/components/QuestionEditor';

export default function NewQuestion() {
  return <><PageTitle title="নতুন প্রশ্ন" sub="প্রশ্ন সবসময় ড্রাফট হিসেবে তৈরি হয়, রিভিউয়ের পরে পাবলিশ হয়।" /><QuestionEditor initial={blankQ()} /></>;
}
