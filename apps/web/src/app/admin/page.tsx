'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn } from '@/lib/utils';
import { Card, LinkButton, Loading, PageTitle, Stat } from '@/components/ui';

type S = { questions: Record<string, number>; openReports: number; signupsToday: number; users: number; pendingPayments: number; attemptsToday: number; tests: number };

export default function AdminHome() {
  const role = useAuth((s) => s.user?.role);
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api<S>('/admin/stats') });
  if (!data) return <Loading />;
  return (
    <>
      <PageTitle title="ড্যাশবোর্ড" right={<LinkButton href="/admin/questions/new" size="sm">＋ নতুন প্রশ্ন</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="পাবলিশড প্রশ্ন" value={bn(data.questions.PUBLISHED)} />
        <Stat label="ড্রাফট (রিভিউ বাকি)" value={bn(data.questions.DRAFT)} />
        <Stat label="রিভিউড" value={bn(data.questions.REVIEWED)} hint="পাবলিশের অপেক্ষায়" />
        <Stat label="আর্কাইভ" value={bn(data.questions.ARCHIVED)} />
        <Stat label="ওপেন রিপোর্ট" value={bn(data.openReports)} />
        <Stat label="আজকের সাইনআপ" value={bn(data.signupsToday)} hint={`মোট ${bn(data.users)}`} />
        <Stat label="আজকের অ্যাটেম্পট" value={bn(data.attemptsToday)} />
        <Stat label="পেন্ডিং পেমেন্ট" value={bn(data.pendingPayments)} />
      </div>
      <Card className="mt-5">
        <h2 className="mb-2 font-semibold">দ্রুত কাজ</h2>
        <div className="flex flex-wrap gap-2.5">
          <LinkButton href="/admin/review" variant="outline" size="sm">রিভিউ কিউ খুলুন ({bn(data.questions.DRAFT)})</LinkButton>
          <LinkButton href="/admin/imports" variant="outline" size="sm">CSV ইমপোর্ট</LinkButton>
          <LinkButton href="/admin/tests" variant="outline" size="sm">টেস্ট তৈরি</LinkButton>
          {role === 'ADMIN' && <LinkButton href="/admin/payments" variant="outline" size="sm">পেমেন্ট অনুমোদন</LinkButton>}
        </div>
        <p className="mt-4 text-sm text-slate-500">নিয়ম: যে লেখে সে রিভিউ করতে পারে না (শুধু অ্যাডমিন পারে); শুধু অ্যাডমিন PUBLISHED করতে পারে। <Link href="/admin/review" className="text-brand-700 underline">কিউতে যান</Link></p>
      </Card>
    </>
  );
}
