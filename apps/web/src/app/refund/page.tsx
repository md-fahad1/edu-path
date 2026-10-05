import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata: Metadata = { title: 'রিফান্ড পলিসি', description: 'প্রিমিয়াম সাবস্ক্রিপশনের রিফান্ড নীতি।', alternates: { canonical: '/refund' } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'রিফান্ড পলিসি' }]} />
      <h1 className="mb-4 text-3xl font-bold">রিফান্ড পলিসি</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8">
        <ul className="list-inside list-disc"><li>পেমেন্টের ৭ দিনের মধ্যে ও প্রিমিয়াম কনটেন্ট ব্যবহার না করলে রিফান্ডের আবেদন করা যাবে।</li><li>ভুল TrxID বা ভুল নম্বরে পাঠানো অর্থ যাচাইয়ের পর ফেরত দেওয়া হবে।</li><li>রিফান্ড bKash/Nagad-এ ৫–৭ কর্মদিবসের মধ্যে পাঠানো হয়।</li></ul>
        <p className="text-sm text-slate-400">এটি একটি টেমপ্লেট; পেমেন্ট গেটওয়ে অনুমোদনের আগে আপনার প্রকৃত নীতি অনুযায়ী সম্পাদনা করুন।</p>
      </div>
    </div>
  );
}
