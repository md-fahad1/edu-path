'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Badge, Button, Card, ErrorBox, Input, Loading, PageTitle } from '@/components/ui';

const TONE = { PENDING: 'amber', SUCCESS: 'green', FAILED: 'red', REFUNDED: 'slate' } as const;

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [err, setErr] = useState('');
  const pays = useQuery({ queryKey: ['pays', status], queryFn: () => api<any[]>(`/admin/payments?status=${status}`) });
  const plans = useQuery({ queryKey: ['aplans'], queryFn: () => api<any[]>('/admin/plans') });
  const [np, setNp] = useState({ name: '', priceBdt: '', durationDays: '' });
  const act = useMutation({ mutationFn: (v: { id: string; a: 'approve' | 'reject' }) => api(`/admin/payments/${v.id}/${v.a}`, { method: 'POST' }), onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['pays'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); }, onError: (e: Error) => setErr(e.message) });
  const addPlan = useMutation({ mutationFn: () => api('/admin/plans', { method: 'POST', json: { name: np.name, priceBdt: Number(np.priceBdt), durationDays: Number(np.durationDays) } }), onSuccess: () => { setNp({ name: '', priceBdt: '', durationDays: '' }); qc.invalidateQueries({ queryKey: ['aplans'] }); }, onError: (e: Error) => setErr(e.message) });
  const togglePlan = useMutation({ mutationFn: (p: any) => api(`/admin/plans/${p.id}`, { method: 'PATCH', json: { name: p.name, priceBdt: p.priceBdt, durationDays: p.durationDays, isActive: !p.isActive } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['aplans'] }) });

  return (
    <>
      <PageTitle title="পেমেন্ট ও প্ল্যান" sub="ম্যানুয়াল bKash/Nagad পেমেন্ট: TrxID মিলিয়ে অনুমোদন দিলে প্রিমিয়াম চালু হয়।" />
      <div className="mb-3 flex gap-1.5">{['PENDING', 'SUCCESS', 'FAILED'].map((s) => <Button key={s} size="sm" variant={s === status ? 'primary' : 'outline'} onClick={() => setStatus(s)}>{s === 'PENDING' ? 'পেন্ডিং' : s === 'SUCCESS' ? 'সফল' : 'বাতিল'}</Button>)}</div>
      {err && <div className="mb-3"><ErrorBox message={err} /></div>}
      {pays.isLoading ? <Loading /> : !pays.data?.length ? <Card className="text-center text-slate-500">কিছু নেই</Card> : (
        <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[40rem] text-left text-[15px]"><thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="px-4 py-2.5">ইউজার</th><th>প্ল্যান</th><th>পরিমাণ</th><th>TrxID / নম্বর</th><th>অবস্থা</th><th /></tr></thead>
          <tbody>{pays.data.map((p) => <tr key={p.id} className="border-t border-slate-100"><td className="px-4 py-3">{p.user.name}<div className="text-xs text-slate-500">{p.user.email ?? p.user.phone}</div></td><td>{p.plan?.name}</td><td>৳{bn(p.amountBdt)}</td><td className="text-sm"><b>{p.trxId}</b><div className="text-slate-500">{p.provider} · {p.senderNumber}</div></td><td><Badge tone={TONE[p.status as keyof typeof TONE]}>{p.status}</Badge></td>
            <td className="space-x-1 pr-3 text-right whitespace-nowrap">{p.status === 'PENDING' && <><Button size="sm" variant="success" disabled={act.isPending} onClick={() => act.mutate({ id: p.id, a: 'approve' })}>অনুমোদন</Button><Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => act.mutate({ id: p.id, a: 'reject' })}>বাতিল</Button></>}</td></tr>)}</tbody></table></Card>
      )}
      <h2 className="mb-3 mt-8 text-lg font-bold">প্ল্যান</h2>
      <Card className="mb-3 grid gap-3 sm:grid-cols-4"><Input label="নাম" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} /><Input label="দাম (৳)" type="number" value={np.priceBdt} onChange={(e) => setNp({ ...np, priceBdt: e.target.value })} /><Input label="মেয়াদ (দিন)" type="number" value={np.durationDays} onChange={(e) => setNp({ ...np, durationDays: e.target.value })} /><div className="flex items-end"><Button disabled={!np.name || !np.priceBdt || !np.durationDays} onClick={() => addPlan.mutate()}>যোগ করুন</Button></div></Card>
      <Card className="!p-0"><ul className="divide-y divide-slate-100">{plans.data?.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3"><span>{p.name} · ৳{bn(p.priceBdt)} · {bn(p.durationDays)} দিন {!p.isActive && <Badge tone="red">বন্ধ</Badge>}</span><Button size="sm" variant="ghost" onClick={() => togglePlan.mutate(p)}>{p.isActive ? 'বন্ধ করুন' : 'চালু করুন'}</Button></li>)}</ul></Card>
    </>
  );
}
