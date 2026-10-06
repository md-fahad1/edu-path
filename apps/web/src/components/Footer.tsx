import Link from 'next/link';
import { SITE_NAME } from '@/lib/utils';
import { CONTACT } from '@/lib/site';

export function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-brand-700">{SITE_NAME}</p>
          <p className="mt-2 text-sm text-slate-600">যাচাই-করা MCQ, সহজ ব্যাখ্যা আর স্মার্ট প্র্যাকটিস – পরীক্ষার প্রস্তুতি হোক ঝামেলাহীন।</p>
          {CONTACT.email && <p className="mt-2 text-sm"><a href={`mailto:${CONTACT.email}`} className="text-slate-600 hover:text-brand-600 hover:underline">📧 {CONTACT.email}</a></p>}
        </div>
        <FooterCol title="পরীক্ষা" links={[['/hsc', 'এইচএসসি'], ['/bcs', 'বিসিএস প্রিলি'], ['/admission', 'ভর্তি পরীক্ষা'], ['/model-test', 'মডেল টেস্ট']]} />
        <FooterCol title="শিখুন" links={[['/practice', 'প্র্যাকটিস মোড'], ['/dashboard', 'ড্যাশবোর্ড'], ['/bookmarks', 'বুকমার্ক'], ['/pricing', 'প্রিমিয়াম']]} />
        <FooterCol title="তথ্য" links={[['/about', 'আমাদের সম্পর্কে'], ['/contact', 'যোগাযোগ'], ['/privacy', 'প্রাইভেসি পলিসি'], ['/terms', 'শর্তাবলি'], ['/refund', 'রিফান্ড পলিসি']]} />
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} {SITE_NAME}. সর্বস্বত্ব সংরক্ষিত।</p>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 font-semibold text-slate-900">{title}</p>
      <ul className="space-y-1.5 text-sm">{links.map(([h, l]) => <li key={h}><Link href={h} className="text-slate-600 hover:text-brand-600 hover:underline">{l}</Link></li>)}</ul>
    </div>
  );
}