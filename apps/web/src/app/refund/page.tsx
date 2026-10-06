import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'রিফান্ড পলিসি', description: 'প্রিমিয়াম সাবস্ক্রিপশনের রিফান্ড নীতি।', alternates: { canonical: '/refund' } };

export default function Page() {
  return (
    <LegalPage title="রিফান্ড পলিসি">
      <h2>রিফান্ডের যোগ্যতা</h2>
      <ul>
        <li>পেমেন্টের <b>৭ দিনের মধ্যে</b> আবেদন করতে হবে এবং প্রিমিয়াম কনটেন্ট (প্রিমিয়াম টেস্ট) ব্যবহার করা যাবে না।</li>
        <li>ভুল TrxID বা ভুল নম্বরে পাঠানো অর্থ যাচাইয়ের পর ফেরত দেওয়া হবে।</li>
        <li>একই সেবার জন্য দুইবার পেমেন্ট হয়ে গেলে অতিরিক্ত অর্থ ফেরত দেওয়া হবে।</li>
        <li>পেমেন্ট করার পর যাচাই হয়নি বা প্রিমিয়াম চালু হয়নি – এমন ক্ষেত্রে পুরো অর্থ ফেরতযোগ্য।</li>
      </ul>

      <h2>যেসব ক্ষেত্রে রিফান্ড হয় না</h2>
      <ul>
        <li>প্রিমিয়াম ব্যবহার শুরুর পর বা ৭ দিন পার হলে।</li>
        <li>শর্ত ভঙ্গের কারণে অ্যাকাউন্ট বন্ধ হলে।</li>
      </ul>

      <h2>কীভাবে আবেদন করবেন</h2>
      <ol className="list-inside list-decimal">
        <li><a href="/contact" className="text-brand-700 underline">যোগাযোগ</a> পেজের মাধ্যমে জানান।</li>
        <li>রেজিস্টার্ড ইমেইল/ফোন, TrxID, পরিমাণ ও কারণ লিখুন।</li>
        <li>যাচাই শেষে ৫–৭ কর্মদিবসের মধ্যে bKash/Nagad-এ ফেরত পাঠানো হবে।</li>
      </ol>
    </LegalPage>
  );
}