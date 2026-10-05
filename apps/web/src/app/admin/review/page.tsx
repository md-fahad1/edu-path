'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LETTERS, bn, cn } from '@/lib/utils';
import { useTree } from '@/components/admin';
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageTitle, Select } from '@/components/ui';
import { RichText } from '@/components/RichText';

type Item = { id: string; text: string; explanation: string | null; answerVerified: boolean; aiGenerated: boolean; source: string | null; createdById: string | null; chapter: { name: string; subject: { name: string } }; creator: { name: string } | null; options: { id: string; label: string; text: string; isCorrect: boolean }[] };

export default function ReviewQueue() {
  const [low, setLow] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [i, setI] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const { subjects } = useTree();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['rq', low, subjectId], queryFn: () => api<{ items: Item[]; total: number }>(`/admin/review-queue?lowConfidence=${low}${subjectId ? `&subjectId=${subjectId}` : ''}`), staleTime: 0 });
  const items = data?.items ?? [];
  const cur = items[i];

  const act = useCallback(async (status: 'REVIEWED' | 'PUBLISHED' | 'ARCHIVED') => {
    if (!cur || busy) return;
    setBusy(true); setErr('');
    try {
      await api(`/admin/questions/${cur.id}/status`, { method: 'PATCH', json: { status } });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      if (i >= items.length - 1) { setI(0); await refetch(); } else { setI(i + 1); }
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }, [cur, busy, i, items.length, qc, refetch]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'a') act(role === 'ADMIN' ? 'PUBLISHED' : 'REVIEWED');
      if (k === 'r') act('ARCHIVED');
      if (k === 's') setI((x) => Math.min(items.length - 1, x + 1));
      if (k === 'e' && cur) location.assign(`/admin/questions/${cur.id}`);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [act, cur, items.length, role]);

  return (
    <>
      <PageTitle title="রিভিউ কিউ" sub="কিবোর্ড: A = অনুমোদন · E = এডিট · R = বাতিল (আর্কাইভ) · S = স্কিপ" right={<Badge tone="blue">{bn(data?.total ?? 0)}টি বাকি</Badge>} />
      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><Select label="বিষয়" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setI(0); }}><option value="">সব বিষয়</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
        <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" checked={low} onChange={(e) => { setLow(e.target.checked); setI(0); }} />শুধু উত্তর যাচাই হয়নি এমন</label>
      </Card>
      {err && <div className="mb-3"><ErrorBox message={err} /></div>}
      {isLoading ? <Loading /> : !cur ? <Empty title="🎉 রিভিউ কিউ খালি" hint="সব ড্রাফট প্রশ্ন দেখা হয়ে গেছে।" /> : (
        <Card className="!p-4 sm:!p-6">
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge tone="blue">{cur.chapter.subject.name} › {cur.chapter.name}</Badge>
            {cur.answerVerified ? <Badge tone="green">অফিসিয়াল কী</Badge> : <Badge tone="amber">উত্তর যাচাই বাকি</Badge>}
            {cur.aiGenerated && <Badge tone="violet">AI</Badge>}
            {cur.creator && <Badge>লেখক: {cur.creator.name}</Badge>}
            {cur.source && <Badge>{cur.source}</Badge>}
            <span className="ml-auto text-slate-400">{bn(i + 1)} / {bn(items.length)}</span>
          </div>
          <h2 className="text-lg font-semibold leading-snug sm:text-xl"><RichText text={cur.text} /></h2>
          <ul className="mt-4 space-y-2">{cur.options.map((o, idx) => <li key={o.id} className={cn('flex gap-3 rounded-xl border px-4 py-3', o.isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}><b>{LETTERS[idx]}.</b><RichText text={o.text} />{o.isCorrect && <span className="ml-auto text-emerald-700">✔ সঠিক</span>}</li>)}</ul>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-[15px]">{cur.explanation ? <><b>ব্যাখ্যা:</b> <RichText text={cur.explanation} /></> : <span className="text-amber-700">⚠ ব্যাখ্যা নেই (ব্যাখ্যা ছাড়া পেজ noindex থাকবে)</span>}</div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Button variant="success" size="lg" disabled={busy} onClick={() => act(role === 'ADMIN' ? 'PUBLISHED' : 'REVIEWED')}>✔ {role === 'ADMIN' ? 'Publish' : 'Approve'} (A)</Button>
            <Link href={`/admin/questions/${cur.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-50">✎ এডিট (E)</Link>
            <Button variant="danger" size="lg" disabled={busy} onClick={() => act('ARCHIVED')}>✘ বাতিল (R)</Button>
            <Button variant="ghost" size="lg" onClick={() => setI(Math.min(items.length - 1, i + 1))} className="col-span-3 sm:col-span-1">স্কিপ (S)</Button>
          </div>
          {role !== 'ADMIN' && <p className="mt-3 text-xs text-slate-500">টিচার “Reviewed” করতে পারে; নিজের লেখা প্রশ্ন নিজে রিভিউ করা যাবে না। Publish শুধু অ্যাডমিন।</p>}
        </Card>
      )}
    </>
  );
}
