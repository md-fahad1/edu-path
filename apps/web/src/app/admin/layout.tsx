'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/components/useRequireAuth';
import { Loading } from '@/components/ui';
import { cn } from '@/lib/utils';

const LINKS = [
  ['/admin', '📊 ড্যাশবোর্ড', false], ['/admin/review', '✅ রিভিউ কিউ', false], ['/admin/questions', '❓ প্রশ্ন', false], ['/admin/imports', '📥 CSV ইমপোর্ট', false],
  ['/admin/tests', '📝 টেস্ট', false], ['/admin/catalog', '🗂 ক্যাটালগ', true], ['/admin/reports', '⚑ রিপোর্ট', true], ['/admin/users', '👥 ইউজার', true], ['/admin/payments', '💳 পেমেন্ট ও প্ল্যান', true],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, allowed } = useRequireAuth(['ADMIN', 'TEACHER']);
  const path = usePathname();
  if (!allowed) return <Loading />;
  const links = LINKS.filter(([, , adminOnly]) => !adminOnly || user?.role === 'ADMIN');
  return (
    <div className="lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-6">
      <nav aria-label="অ্যাডমিন মেনু" className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:mb-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
        <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">{user?.role === 'ADMIN' ? 'অ্যাডমিন' : 'টিচার'} প্যানেল</p>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={cn('shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-[15px] font-medium', (href === '/admin' ? path === href : path.startsWith(href)) ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 lg:bg-transparent lg:ring-0')}>{label}</Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
