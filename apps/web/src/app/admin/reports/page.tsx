'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { bn, trunc } from '@/lib/utils';
import { Badge, Button, Card, Empty, Loading, PageTitle } from '@/components/ui';

const REASON: Record<string, string> = { WRONG_ANSWER: 'উত্তর ভুল', TYPO: 'বানান/টাইপো', OUTDATED: 'তথ্য পুরনো', OTHER: 'অন্য' };

export default function Reports() {
  const [status, setStatus] = useState('OPEN');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['reports', status], queryFn: () => api<any[]>(`/admin/reports?status=${status}`) });
  const upd = useMutation({ mutationFn: (v: { id: string; status: string }) => api(`/admin/reports/${v.id}`, { method: 'PATCH', json: { status: v.status } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }) });
  return (
    <>
      <PageTitle title="স্টুডেন্ট রিপোর্ট" sub="৩টি ওপেন রিপোর্ট হলে প্রশ্ন নিজে থেকে Reviewed-এ ফিরে যায়।" right={<div className="flex gap-1.5">{['OPEN', 'RESOLVED', 'REJECTED'].map((s) => <Button key={s} size="sm" variant={s === status ? 'primary' : 'outline'} onClick={() => setStatus(s)}>{s === 'OPEN' ? 'ওপেন' : s === 'RESOLVED' ? 'সমাধান' : 'বাতিল'}</Button>)}</div>} />
      {isLoading ? <Loading /> : !data?.length ? <Empty title="কোনো রিপোর্ট নেই" /> : (
        <div className="space-y-3">{data.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center gap-2"><Badge tone="red">{REASON[r.reason] ?? r.reason}</Badge><span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString('bn-BD')} · {r.user?.name ?? 'গেস্ট'}</span></div>
            <p className="mt-2 font-medium">{trunc(r.question.text, 140)}</p>
            <p className="mt-1 text-sm text-emerald-700">বর্তমান উত্তর: {r.question.options.find((o: any) => o.isCorrect)?.text}</p>
            {r.note && <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">“{r.note}”</p>}
            <div className="mt-3 flex flex-wrap gap-2"><Link href={`/admin/questions/${r.question.id}`} className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">প্রশ্ন এডিট করুন</Link>{status === 'OPEN' && <><Button size="sm" variant="success" onClick={() => upd.mutate({ id: r.id, status: 'RESOLVED' })}>✔ সমাধান হয়েছে</Button><Button size="sm" variant="ghost" onClick={() => upd.mutate({ id: r.id, status: 'REJECTED' })}>বাতিল</Button></>}</div>
          </Card>))}</div>
      )}
      <p className="mt-3 text-xs text-slate-400">মোট {bn(data?.length ?? 0)}টি</p>
    </>
  );
}
