import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata: Metadata = { title: 'আমাদের সম্পর্কে', description: 'শিক্ষাপথ কী এবং কেন – আমাদের লক্ষ্য ও কনটেন্ট নীতি।', alternates: { canonical: '/about' } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'আমাদের সম্পর্কে' }]} />
      <h1 className="mb-4 text-3xl font-bold">আমাদের সম্পর্কে</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8">
        <p>শিক্ষাপথ একটি বাংলা MCQ ও পরীক্ষা-প্রস্তুতি প্ল্যাটফর্ম, যেখানে এইচএসসি, বিসিএস প্রিলি ও ভর্তি পরীক্ষার প্রশ্ন চ্যাপ্টারভিত্তিকভাবে সাজানো আছে।</p>
        <h2 className="text-xl font-semibold text-slate-900">আমাদের নীতি</h2>
        <ul className="list-inside list-disc"><li>পরিমাণ নয়, মান – শুধু রিভিউ-করা প্রশ্নই প্রকাশিত হয়।</li><li>বোর্ড/অফিসিয়াল প্রশ্ন ও নিজস্ব ভাষায় লেখা ব্যাখ্যা ব্যবহার করা হয়; কোচিং গাইডের কনটেন্ট কপি করা হয় না।</li><li>ভুল পেলে প্রতিটি প্রশ্নের নিচে “ভুল রিপোর্ট” বাটন আছে।</li><li>প্রশ্ন, উত্তর ও ব্যাখ্যা সবসময় বিনামূল্যে।</li></ul>
      </div>
    </div>
  );
}
