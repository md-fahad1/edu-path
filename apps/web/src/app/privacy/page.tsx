import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata: Metadata = { title: 'প্রাইভেসি পলিসি', description: 'আমরা কোন তথ্য সংগ্রহ করি এবং কীভাবে ব্যবহার করি।', alternates: { canonical: '/privacy' } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'প্রাইভেসি পলিসি' }]} />
      <h1 className="mb-4 text-3xl font-bold">প্রাইভেসি পলিসি</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8">
        <p>আমরা শুধু প্রয়োজনীয় তথ্য (নাম, ইমেইল/ফোন, পরীক্ষার ফলাফল) সংগ্রহ করি, যা দিয়ে আপনার অ্যাকাউন্ট ও অগ্রগতি দেখানো হয়।</p>
        <ul className="list-inside list-disc"><li>পাসওয়ার্ড এনক্রিপ্টেড (bcrypt) অবস্থায় সংরক্ষিত হয়।</li><li>লিডারবোর্ডে শুধু নামের প্রথম অংশ দেখানো হয়; ইমেইল বা ফোন কখনো নয়।</li><li>অ্যাকাউন্ট মুছলে আপনার সব অ্যাটেম্পট ও পরিসংখ্যান মুছে যায়।</li><li>বিজ্ঞাপন সেবা চালু হলে তৃতীয় পক্ষ কুকি ব্যবহার করতে পারে – এ অংশ হালনাগাদ করুন।</li></ul>
        <p className="text-sm text-slate-400">এটি একটি টেমপ্লেট; লাইভ করার আগে আপনার প্রকৃত নীতি অনুযায়ী সম্পাদনা করুন।</p>
      </div>
    </div>
  );
}
