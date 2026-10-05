import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata: Metadata = { title: 'ব্যবহারের শর্তাবলি', description: 'প্ল্যাটফর্ম ব্যবহারের নিয়ম ও শর্ত।', alternates: { canonical: '/terms' } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'ব্যবহারের শর্তাবলি' }]} />
      <h1 className="mb-4 text-3xl font-bold">ব্যবহারের শর্তাবলি</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8">
        <ul className="list-inside list-disc"><li>কনটেন্ট শুধু ব্যক্তিগত শেখার জন্য; অনুমতি ছাড়া কপি বা বিক্রি নিষিদ্ধ।</li><li>পরীক্ষায় অসদুপায় (একাধিক অ্যাকাউন্ট, স্ক্রিপ্ট) পেলে অ্যাকাউন্ট বন্ধ হতে পারে।</li><li>আমরা সর্বোচ্চ যত্নে প্রশ্ন যাচাই করি, তবে ভুলের জন্য আনুষ্ঠানিক পরীক্ষার ফলাফলের দায় নিই না।</li><li>প্রিমিয়াম মেয়াদ শেষে অ্যাক্সেস স্বয়ংক্রিয়ভাবে বন্ধ হয়।</li></ul>
        <p className="text-sm text-slate-400">এটি একটি টেমপ্লেট; লাইভের আগে আইনি পরামর্শ নিয়ে হালনাগাদ করুন।</p>
      </div>
    </div>
  );
}
