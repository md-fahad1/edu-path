import type { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumb } from './Breadcrumb';
import { CONTACT, LEGAL_UPDATED } from '@/lib/site';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ name: title }]} />
      <h1 className="mb-1 text-3xl font-bold">{title}</h1>
      <p className="mb-4 text-sm text-slate-500">সর্বশেষ হালনাগাদ: {LEGAL_UPDATED}</p>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 leading-8 text-slate-700 sm:p-8 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-inside [&_ul]:list-disc">
        {children}
        <p className="border-t border-slate-100 pt-4 text-sm text-slate-500">
          এ বিষয়ে প্রশ্ন থাকলে <Link href="/contact" className="text-brand-700 underline">যোগাযোগ</Link> পেজ দেখুন
          {CONTACT.email && <> অথবা <a href={`mailto:${CONTACT.email}`} className="text-brand-700 underline">{CONTACT.email}</a>-এ লিখুন</>}।
        </p>
      </div>
    </div>
  );
}