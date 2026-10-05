'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import { bn, cn } from '@/lib/utils';
import { Badge, Card, Empty, LinkButton, Loading, PageTitle, Progress, Stat, accTone } from '@/components/ui';

type Overview = { totalSolved: number; accuracy: number; streak: number; testsTaken: number; subjectAccuracy: { subject: string; attempted: number; accuracy: number }[] };
type Weak = { topicId: string; topic: string; chapterId: string; chapter: string; accuracy: number; attempted: number }[];
type Hist = { id: string; title: string; slug: string; score: number; total: number; correct: number; wrong: number; skipped: number; at: string }[];
type Act = { date: string; count: number }[];
type Me = { isPremium: boolean };

export function DashboardClient() {
  const { user, allowed } = useRequireAuth();
  const on = { enabled: allowed };
  const ov = useQuery({ queryKey: ['ov'], queryFn: () => api<Overview>('/analytics/overview'), ...on });
  const weak = useQuery({ queryKey: ['weak'], queryFn: () => api<Weak>('/analytics/weak-topics'), ...on });
  const hist = useQuery({ queryKey: ['hist'], queryFn: () => api<Hist>('/analytics/history'), ...on });
  const act = useQuery({ queryKey: ['act'], queryFn: () => api<Act>('/analytics/activity'), ...on });
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/users/me'), ...on });
  if (!allowed || ov.isLoading) return <Loading />;
  const o = ov.data;

  return (
    <>
      <PageTitle title={`স্বাগতম, ${user?.name.split(' ')[0]} 👋`} sub="আপনার প্রস্তুতির সারসংক্ষেপ" right={me.data?.isPremium ? <Badge tone="amber">👑 প্রিমিয়াম</Badge> : <LinkButton href="/pricing" variant="outline" size="sm">👑 প্রিমিয়াম নিন</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="মোট সমাধান" value={bn(o?.totalSolved ?? 0)} />
        <Stat label="সঠিকতা" value={`${bn(o?.accuracy ?? 0)}%`} />
        <Stat label="🔥 স্ট্রিক" value={`${bn(o?.streak ?? 0)} দিন`} hint="প্রতিদিন অন্তত ১টি প্রশ্ন" />
        <Stat label="টেস্ট দিয়েছেন" value={bn(o?.testsTaken ?? 0)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">⚠️ দুর্বল টপিক</h2>
          {weak.data?.length ? <ul className="space-y-3">{weak.data.map((w) => (
            <li key={w.topicId}><div className="mb-1 flex items-center justify-between text-sm"><span><b>{w.topic}</b> <span className="text-slate-500">· {w.chapter}</span></span><span className="font-semibold text-rose-600">{bn(w.accuracy)}%</span></div><Progress value={w.accuracy} tone={accTone(w.accuracy)} /><Link href={`/practice?chapterId=${w.chapterId}`} className="mt-1 inline-block text-xs text-brand-700 hover:underline">প্র্যাকটিস করুন →</Link></li>))}</ul>
            : <p className="text-slate-500">কয়েকটি প্রশ্ন সমাধান করলে আপনার দুর্বল টপিক এখানে দেখা যাবে।</p>}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">📚 বিষয়ভিত্তিক সঠিকতা</h2>
          {o?.subjectAccuracy.length ? <div className="space-y-3">{o.subjectAccuracy.map((s) => <div key={s.subject}><div className="mb-1 flex justify-between text-sm"><span>{s.subject}</span><span className="text-slate-500">{bn(s.accuracy)}% · {bn(s.attempted)}টি</span></div><Progress value={s.accuracy} tone={accTone(s.accuracy)} /></div>)}</div> : <p className="text-slate-500">এখনো কোনো ডেটা নেই।</p>}
        </Card>
      </div>

      <Card className="mt-4"><h2 className="mb-3 font-semibold">🗓 অ্যাক্টিভিটি (গত ১৭ সপ্তাহ)</h2><Heatmap data={act.data ?? []} /></Card>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">📝 টেস্ট ইতিহাস</h2><Link href="/bookmarks" className="text-sm text-brand-700 hover:underline">★ বুকমার্ক →</Link></div>
        {hist.data?.length ? <ul className="divide-y divide-slate-100">{hist.data.map((h) => (
          <li key={h.id}><Link href={`/result/${h.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-medium">{h.title}</p><p className="text-xs text-slate-500">{new Date(h.at).toLocaleDateString('bn-BD')} · সঠিক {bn(h.correct)} · ভুল {bn(h.wrong)}</p></div><span className="shrink-0 font-bold text-brand-700">{bn(h.score)}/{bn(h.total)}</span></Link></li>))}</ul>
          : <Empty title="এখনো কোনো টেস্ট দেননি" action={<LinkButton href="/model-test">প্রথম টেস্ট দিন</LinkButton>} />}
      </Card>
    </>
  );
}

function Heatmap({ data }: { data: Act }) {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const weeks = 17;
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1) - end.getUTCDay());
  const cols: { date: string; c: number }[][] = [];
  for (let w = 0; w < weeks + 1; w++) {
    const col: { date: string; c: number }[] = [];
    for (let d = 0; d < 7; d++) { const dt = new Date(start); dt.setUTCDate(start.getUTCDate() + w * 7 + d); if (dt > end) continue; const k = dt.toISOString().slice(0, 10); col.push({ date: k, c: map.get(k) ?? 0 }); }
    cols.push(col);
  }
  const tone = (c: number) => (c === 0 ? 'bg-slate-100' : c < 5 ? 'bg-emerald-200' : c < 15 ? 'bg-emerald-400' : 'bg-emerald-600');
  return <div className="overflow-x-auto"><div className="flex gap-1">{cols.map((col, i) => <div key={i} className="flex flex-col gap-1">{col.map((d) => <div key={d.date} title={`${d.date}: ${d.c}`} className={cn('size-3.5 rounded-[3px]', tone(d.c))} />)}</div>)}</div></div>;
}
