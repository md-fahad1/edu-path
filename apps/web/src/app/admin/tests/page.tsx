'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn } from '@/lib/utils';
import { useTree } from '@/components/admin';
import { Badge, Button, Card, ErrorBox, Input, Loading, PageTitle, Select } from '@/components/ui';

export default function AdminTests() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const { chapters } = useTree();
  const exams = useQuery({ queryKey: ['exams-all'], queryFn: () => api<any[]>('/exams') });
  const list = useQuery({ queryKey: ['atests'], queryFn: () => api<any[]>('/admin/tests') });
  const [f, setF] = useState({ title: '', source: 'chapter', chapterId: '', examId: '', durationMin: 20, negativeMark: 0.25, count: '', isPremium: false, isPublished: false });
  const [err, setErr] = useState('');
  const create = useMutation({
    mutationFn: () => api('/admin/tests', { method: 'POST', json: { title: f.title, ...(f.source === 'chapter' ? { chapterId: f.chapterId } : { examId: f.examId }), durationMin: Number(f.durationMin), negativeMark: Number(f.negativeMark), count: f.count ? Number(f.count) : undefined, isPremium: f.isPremium, isPublished: f.isPublished } }),
    onSuccess: () => { setErr(''); setF({ ...f, title: '' }); qc.invalidateQueries({ queryKey: ['atests'] }); }, onError: (e: Error) => setErr(e.message),
  });
  const patch = useMutation({ mutationFn: (v: { id: string; d: object }) => api(`/admin/tests/${v.id}`, { method: 'PATCH', json: v.d }), onSuccess: () => qc.invalidateQueries({ queryKey: ['atests'] }), onError: (e: Error) => setErr(e.message) });
  const ok = f.title.length >= 3 && (f.source === 'chapter' ? f.chapterId : f.examId);

  return (
    <>
      <PageTitle title="মডেল টেস্ট" sub="শুধু PUBLISHED প্রশ্ন থেকে টেস্ট তৈরি হয়। টিচারের টেস্ট ড্রাফট থাকে, অ্যাডমিন পাবলিশ করে।" />
      <Card className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3"><Input label="টেস্টের নাম *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <Select label="প্রশ্নের উৎস" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="chapter">চ্যাপ্টার</option><option value="exam">পরীক্ষা/সেট</option></Select>
        {f.source === 'chapter' ? <Select label="চ্যাপ্টার" value={f.chapterId} onChange={(e) => setF({ ...f, chapterId: e.target.value })}><option value="">— বাছুন —</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select> : <Select label="পরীক্ষা" value={f.examId} onChange={(e) => setF({ ...f, examId: e.target.value })}><option value="">— বাছুন —</option>{exams.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>}
        <Input label="প্রশ্নসংখ্যা (খালি = সব)" type="number" value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} />
        <Input label="সময় (মিনিট)" type="number" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })} />
        <Input label="নেগেটিভ মার্ক" type="number" step="0.25" value={f.negativeMark} onChange={(e) => setF({ ...f, negativeMark: Number(e.target.value) })} />
        <div className="flex items-end gap-4 pb-2.5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={f.isPremium} onChange={(e) => setF({ ...f, isPremium: e.target.checked })} />প্রিমিয়াম</label>{role === 'ADMIN' && <label className="flex items-center gap-2"><input type="checkbox" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />সাথে সাথে পাবলিশ</label>}</div>
        <div className="sm:col-span-2 lg:col-span-3">{err && <div className="mb-2"><ErrorBox message={err} /></div>}<Button disabled={!ok || create.isPending} onClick={() => create.mutate()}>টেস্ট তৈরি করুন</Button></div>
      </Card>
      {list.isLoading ? <Loading /> : (
        <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[36rem] text-left text-[15px]"><thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="px-4 py-2.5">টেস্ট</th><th>প্রশ্ন</th><th>অ্যাটেম্পট</th><th>অবস্থা</th><th /></tr></thead>
          <tbody>{list.data?.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="px-4 py-3">{t.title}<div className="text-xs text-slate-500">{bn(t.durationMin)} মিনিট · নেগেটিভ {bn(t.negativeMark)}</div></td><td>{bn(t._count.questions)}</td><td>{bn(t._count.attempts)}</td><td><div className="flex gap-1">{t.isPublished ? <Badge tone="green">পাবলিশড</Badge> : <Badge>ড্রাফট</Badge>}{t.isPremium && <Badge tone="amber">👑</Badge>}</div></td>
            <td className="space-x-1 pr-3 text-right whitespace-nowrap">{role === 'ADMIN' && <Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: t.id, d: { isPublished: !t.isPublished } })}>{t.isPublished ? 'আনপাবলিশ' : 'পাবলিশ'}</Button>}<Button size="sm" variant="ghost" onClick={() => patch.mutate({ id: t.id, d: { isPremium: !t.isPremium } })}>{t.isPremium ? 'ফ্রি করুন' : 'প্রিমিয়াম করুন'}</Button></td></tr>)}</tbody></table></Card>
      )}
    </>
  );
}
