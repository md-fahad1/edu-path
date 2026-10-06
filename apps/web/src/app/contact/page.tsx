import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CONTACT } from '@/lib/site';

export const metadata: Metadata = { title: 'যোগাযোগ', description: 'প্রশ্ন, মতামত বা সমস্যা জানাতে আমাদের সাথে যোগাযোগ করুন।', alternates: { canonical: '/contact' } };

export default function Page() {
  const rows: [string, React.ReactNode][] = [];
  if (CONTACT.email) rows.push(['📧 ইমেইল', <a key="e" href={`mailto:${CONTACT.email}`} className="text-brand-700 underline">{CONTACT.email}</a>]);
  if (CONTACT.phone) rows.push(['📞 ফোন / হোয়াটসঅ্যাপ', <a key="p" href={`tel:${CONTACT.phone}`} className="text-brand-700 underline">{CONTACT.phone}</a>]);
  if (CONTACT.facebook) rows.push(['👍 ফেসবুক পেজ', <a key="f" href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">{CONTACT.facebook.replace(/^https?:\/\/(www\.)?/, '')}</a>]);
  if (CONTACT.address) rows.push(['📍 ঠিকানা', CONTACT.address]);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: 'যোগাযোগ' }]} />
      <h1 className="mb-4 text-3xl font-bold">যোগাযোগ</h1>
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8">
        <p>যেকোনো প্রশ্ন, মতামত, পেমেন্ট-সংক্রান্ত সমস্যা বা ভুল সংশোধনের অনুরোধ আমাদের জানান। সাধারণত ২৪–৪৮ ঘণ্টার মধ্যে উত্তর দেওয়ার চেষ্টা করি।</p>

        {rows.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-[200px_1fr]">
            {rows.map(([k, val]) => (<div key={k} className="contents"><dt className="font-semibold text-slate-900">{k}</dt><dd>{val}</dd></div>))}
          </dl>
        )}

        <div className="rounded-xl bg-slate-50 p-4 text-[15px]">
          <p className="font-semibold text-slate-900">কোন বিষয়ে কীভাবে জানাবেন</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><b>প্রশ্ন/উত্তরে ভুল:</b> সরাসরি প্রশ্নের নিচের “ভুল রিপোর্ট” বাটন – এটাই সবচেয়ে দ্রুত।</li>
            <li><b>পেমেন্ট/প্রিমিয়াম:</b> TrxID ও যে নম্বর থেকে পাঠিয়েছেন, তা সহ লিখুন।</li>
            <li><b>অ্যাকাউন্ট সমস্যা:</b> রেজিস্ট্রেশনের ইমেইল বা ফোন নম্বর সহ লিখুন (পাসওয়ার্ড কখনো পাঠাবেন না)।</li>
          </ul>
        </div>
      </div>
    </div>
  );
}