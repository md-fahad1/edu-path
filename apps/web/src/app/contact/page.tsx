import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata: Metadata = { title: 'যোগাযোগ', description: 'প্রশ্ন, মতামত বা সমস্যা জানাতে আমাদের সাথে যোগাযোগ করুন।', alternates: { canonical: '/contact' } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'যোগাযোগ' }]} />
      <h1 className="mb-4 text-3xl font-bold">যোগাযোগ</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8">
        <p>যেকোনো প্রশ্ন, মতামত বা ভুল সংশোধনের অনুরোধ আমাদের জানান।</p>
        <p><b>ইমেইল:</b> support@example.com <span className="text-sm text-slate-400">(আপনার ইমেইল দিয়ে বদলে নিন)</span></p>
        <p>প্রশ্নে ভুল পেলে সরাসরি প্রশ্নের নিচের “ভুল রিপোর্ট” বাটন ব্যবহার করুন – এটাই সবচেয়ে দ্রুত উপায়।</p>
      </div>
    </div>
  );
}
