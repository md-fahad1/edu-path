'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn, trunc } from '@/lib/utils';
import { STATUS_BN, STATUS_TONE, useTree } from '@/components/admin';
import { Badge, Button, Card, Empty, ErrorBox, Input, LinkButton, Loading, PageTitle, Select } from '@/components/ui';

type Row = { id: string; slug: string; text: string; status: string; difficulty: string; answerVerified: boolean; chapter: { name: string }; _count: { reports: number } };
type Res = { items: Row[]; total: number; page: number; totalPages: number };

export default function QuestionsPage() {
  const [f, setF] = useState({ search: '', status: '', chapterId: '', page: 1 });
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const { chapters } = useTree();
  const qs = new URLSearchParams({ page: String(f.page), ...(f.search && { search: f.search }), ...(f.status && { status: f.status }), ...(f.chapterId && { chapterId: f.chapterId }) });
  const { data, isLoading, error } = useQuery({ queryKey: ['aq', f], queryFn: () => api<Res>(`/admin/questions?${qs}`) });
  const bulk = useMutation({
    mutationFn: (status: string) => api<{ ok: number; failed: { reason: string }[] }>('/admin/questions/bulk-status', { method: 'PATCH', json: { ids: sel, status } }),
    onSuccess: (r) => { setMsg(`${bn(r.ok)}টি আপডেট হয়েছে${r.failed.length ? `, ${bn(r.failed.length)}টি ব্যর্থ: ${r.failed[0].reason}` : ''}`); setSel([]); qc.invalidateQueries({ queryKey: ['aq'] }); },
    onError: (e: Error) => setMsg(e.message),
  });
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <PageTitle title="প্রশ্নসমূহ" right={<LinkButton href="/admin/questions/new" size="sm">＋ নতুন প্রশ্ন</LinkButton>} />
      <Card className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input label="সার্চ" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} placeholder="প্রশ্নের লেখা…" />
        <Select label="স্ট্যাটাস" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })}><option value="">সব</option>{Object.entries(STATUS_BN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select label="চ্যাপ্টার" value={f.chapterId} onChange={(e) => setF({ ...f, chapterId: e.target.value, page: 1 })}><option value="">সব</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
      </Card>
      {sel.length > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-white">
          <span className="text-sm">{bn(sel.length)}টি নির্বাচিত</span>
          <Button size="sm" variant="outline" onClick={() => bulk.mutate('REVIEWED')}>→ Reviewed</Button>
          {role === 'ADMIN' && <Button size="sm" variant="success" onClick={() => bulk.mutate('PUBLISHED')}>→ Publish</Button>}
          <Button size="sm" variant="outline" onClick={() => bulk.mutate('DRAFT')}>→ Draft</Button>
          <Button size="sm" variant="danger" onClick={() => bulk.mutate('ARCHIVED')}>আর্কাইভ</Button>
          <button className="ml-auto text-sm underline" onClick={() => setSel([])}>বাতিল</button>
        </div>
      )}
      {msg && <div className="mb-3"><ErrorBox message={msg} /></div>}
      {error && <ErrorBox message={(error as Error).message} />}
      {isLoading ? <Loading /> : !data?.items.length ? <Empty title="কোনো প্রশ্ন পাওয়া যায়নি" /> : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[40rem] text-left text-[15px]">
            <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="সব নির্বাচন" checked={sel.length === data.items.length} onChange={(e) => setSel(e.target.checked ? data.items.map((i) => i.id) : [])} /></th><th>প্রশ্ন</th><th>চ্যাপ্টার</th><th>স্ট্যাটাস</th><th /></tr></thead>
            <tbody>{data.items.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                <td className="px-3 py-3"><input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} aria-label="নির্বাচন" /></td>
                <td className="max-w-sm py-3 pr-3">{trunc(r.text, 90)}<div className="mt-1 flex gap-1.5">{!r.answerVerified && <Badge tone="amber">উত্তর যাচাই বাকি</Badge>}{r._count.reports > 0 && <Badge tone="red">⚑ {bn(r._count.reports)}</Badge>}</div></td>
                <td className="py-3 pr-3 text-sm text-slate-600">{trunc(r.chapter.name, 34)}</td>
                <td className="py-3"><Badge tone={STATUS_TONE[r.status]}>{STATUS_BN[r.status]}</Badge></td>
                <td className="py-3 pr-3 text-right"><Link href={`/admin/questions/${r.id}`} className="font-medium text-brand-700 hover:underline">এডিট</Link></td>
              </tr>))}</tbody>
          </table>
        </Card>
      )}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between"><Button variant="outline" size="sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>← আগের</Button><span className="text-sm text-slate-500">{bn(data.page)} / {bn(data.totalPages)} · মোট {bn(data.total)}</span><Button variant="outline" size="sm" disabled={f.page >= data.totalPages} onClick={() => setF({ ...f, page: f.page + 1 })}>পরের →</Button></div>
      )}
    </>
  );
}
