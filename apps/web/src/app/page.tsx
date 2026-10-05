import Link from 'next/link';
import { sapi } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Card, LinkButton } from '@/components/ui';
import { SearchBox } from '@/components/SearchBox';

export const revalidate = 3600;

type Cat = { id: string; name: string; slug: string; description: string | null; _count: { subjects: number; exams: number } };
type Tree = { slug: string; name: string; subjects: { slug: string; name: string; chapters: { id: string; name: string; slug: string; _count: { questions: number } }[] }[] }[];
type TestRow = { id: string; title: string; slug: string; durationMin: number; isPremium: boolean; _count: { questions: number } };

const ICON: Record<string, string> = { hsc: '🎓', bcs: '🏛️', admission: '🏫' };

export default async function Home() {
  const [cats, tree, tests] = await Promise.all([sapi<Cat[]>('/categories', 3600), sapi<Tree>('/catalog/tree', 3600), sapi<TestRow[]>('/tests', 600)]);
  const popular = tree.flatMap((c) => c.subjects.flatMap((s) => s.chapters.map((ch) => ({ ...ch, href: `/${c.slug}/${s.slug}/${ch.slug}`, cat: c.name })))).sort((a, b) => b._count.questions - a._count.questions).slice(0, 6);
  const totalQ = tree.flatMap((c) => c.subjects.flatMap((s) => s.chapters)).reduce((n, c) => n + c._count.questions, 0);

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 px-5 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">পরীক্ষার প্রস্তুতি হোক <span className="text-amber-300">স্মার্ট ও সহজ</span></h1>
        <p className="mt-3 max-w-xl text-brand-100 sm:text-lg">এইচএসসি, বিসিএস ও ভর্তি পরীক্ষার যাচাই-করা MCQ, সহজ ব্যাখ্যা আর ফ্রি মডেল টেস্ট – যেকোনো ডিভাইসে, দ্রুত।</p>
        <div className="mt-6 max-w-xl text-slate-900"><SearchBox /></div>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/practice" variant="outline" size="lg" className="!border-white !bg-white !text-brand-700 hover:!bg-brand-50">প্র্যাকটিস শুরু করুন</LinkButton>
          <LinkButton href="/model-test" variant="ghost" size="lg" className="!text-white hover:!bg-white/10">মডেল টেস্ট দিন</LinkButton>
        </div>
        <p className="mt-5 text-sm text-brand-100">{bn(totalQ)}+ প্রশ্ন · {bn(tests.length)}টি মডেল টেস্ট · সম্পূর্ণ ফ্রি প্র্যাকটিস</p>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-xl font-bold sm:text-2xl">আপনার পরীক্ষা বেছে নিন</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {cats.map((c) => (
            <Link key={c.id} href={`/${c.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
              <div className="text-3xl">{ICON[c.slug] ?? '📘'}</div>
              <h3 className="mt-2 text-lg font-semibold group-hover:text-brand-700">{c.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-700">{bn(c._count.subjects)}টি বিষয় →</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="pop">
        <h2 id="pop" className="mb-4 text-xl font-bold sm:text-2xl">জনপ্রিয় চ্যাপ্টার</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((c) => (
            <Link key={c.id} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm">
              <p className="text-xs font-medium text-brand-600">{c.cat}</p>
              <p className="mt-1 font-semibold leading-snug">{c.name}</p>
              <p className="mt-2 text-sm text-slate-500">{bn(c._count.questions)}টি MCQ</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="tests">
        <div className="mb-4 flex items-end justify-between"><h2 id="tests" className="text-xl font-bold sm:text-2xl">সর্বশেষ মডেল টেস্ট</h2><Link href="/model-test" className="text-sm font-medium text-brand-700 hover:underline">সব দেখুন →</Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tests.slice(0, 6).map((t) => (
            <Card key={t.id} className="flex flex-col">
              <p className="font-semibold leading-snug">{t.title}</p>
              <p className="mt-1 text-sm text-slate-500">{bn(t._count.questions)} প্রশ্ন · {bn(t.durationMin)} মিনিট{t.isPremium && ' · 👑 প্রিমিয়াম'}</p>
              <LinkButton href={`/model-test/${t.slug}`} variant="outline" size="sm" className="mt-3 self-start">বিস্তারিত</LinkButton>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[['✅', 'যাচাই-করা কনটেন্ট', 'প্রতিটি প্রশ্ন রিভিউ হয়ে তবেই প্রকাশিত হয়, ভুল পেলে এক ক্লিকে রিপোর্ট করুন।'], ['📊', 'দুর্বল টপিক ধরুন', 'কোন টপিকে বারবার ভুল হচ্ছে, ড্যাশবোর্ডে আপনার জন্য আলাদা করে দেখানো হয়।'], ['⚡', 'দ্রুত ও মোবাইল-ফ্রেন্ডলি', 'কম ডেটায় ফাস্ট লোড, ফোনে ব্যবহার করা সহজ – কোনো ঝামেলা বা বিরক্তিকর বিজ্ঞাপন নেই।']].map(([i, t, d]) => (
          <Card key={t}><div className="text-2xl">{i}</div><h3 className="mt-2 font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></Card>
        ))}
      </section>
    </div>
  );
}
