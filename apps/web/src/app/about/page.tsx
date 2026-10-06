import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata: Metadata = { title: 'আমাদের সম্পর্কে', description: 'শিক্ষাপথ কী এবং কেন – আমাদের লক্ষ্য ও কনটেন্ট নীতি।', alternates: { canonical: '/about' } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'আমাদের সম্পর্কে' }]} />
      <h1 className="mb-4 text-3xl font-bold">আমাদের সম্পর্কে</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-inside [&_ul]:list-disc">
        <p>শিক্ষাপথ একটি বাংলা MCQ ও পরীক্ষা-প্রস্তুতি প্ল্যাটফর্ম। এইচএসসি, বিসিএস প্রিলি ও ভর্তি পরীক্ষার প্রশ্ন এখানে চ্যাপ্টার ও টপিক অনুযায়ী সাজানো – যাতে আপনি ঠিক যেটুকু দুর্বল, সেটুকুই অনুশীলন করতে পারেন।</p>

        <h2>কী কী পাবেন</h2>
        <ul>
          <li><b>স্মার্ট প্র্যাকটিস:</b> আপনার দুর্বল টপিক ও আগের ভুল প্রশ্ন অনুযায়ী পরের প্রশ্ন বাছাই।</li>
          <li><b>ভুলের নোটবুক:</b> যে প্রশ্নে ভুল করেছেন, সেটি নির্দিষ্ট বিরতিতে আবার দেখানো হয় – যতক্ষণ না আয়ত্ত হয়।</li>
          <li><b>ডেইলি চ্যালেঞ্জ ও লিডারবোর্ড:</b> প্রতিদিন ১০টি প্রশ্ন, XP, ব্যাজ ও সাপ্তাহিক র‍্যাঙ্কিং।</li>
          <li><b>মডেল টেস্ট:</b> সময়সহ পরীক্ষার পরিবেশে অনুশীলন, শেষে বিস্তারিত ফলাফল ও ব্যাখ্যা।</li>
          <li><b>ড্যাশবোর্ড:</b> সঠিকতা, স্ট্রিক ও বিষয়ভিত্তিক অগ্রগতি এক জায়গায়।</li>
        </ul>

        <h2>আমাদের নীতি</h2>
        <ul>
          <li>পরিমাণ নয়, মান – শুধু রিভিউ-করা প্রশ্নই প্রকাশিত হয়।</li>
          <li>বোর্ড/অফিসিয়াল প্রশ্ন ও নিজস্ব ভাষায় লেখা ব্যাখ্যা ব্যবহার করা হয়; কোচিং গাইডের কনটেন্ট কপি করা হয় না।</li>
          <li>ভুল পেলে প্রতিটি প্রশ্নের নিচে “ভুল রিপোর্ট” বাটন আছে; রিপোর্ট যাচাই করে দ্রুত সংশোধন করা হয়।</li>
          <li>প্রশ্ন, উত্তর ও ব্যাখ্যা বিনামূল্যে; প্রিমিয়াম শুধু বাড়তি সুবিধার জন্য।</li>
        </ul>

        <p><Link href="/practice?mode=smart" className="font-semibold text-brand-700 underline">এখনই প্র্যাকটিস শুরু করুন →</Link></p>
      </div>
    </div>
  );
}