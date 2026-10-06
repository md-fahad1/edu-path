'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { bn, trunc } from '@/lib/utils';
import { Badge, Button, Card, ErrorBox, Input, PageTitle, Select, Textarea } from '@/components/ui';

type Cat = { id: string; slug: string; name: string; icon: string | null; isActive: boolean; total: number; published: number };
type Item = { id: string; question: string; difficulty: string; isPublished: boolean; category: { name: string } };
type List = { items: Item[]; total: number; page: number; totalPages: number };
type ImportRes = { imported: number; failed: number; errors: { line: number; errors: string[] }[] };

const SAMPLE = `category_slug,question,answer,tips,difficulty,tags
bcs-viva,"আপনি কেন প্রশাসন ক্যাডারে আসতে চান?","এখানে আপনার নিজের লেখা নমুনা উত্তর বসান।","উত্তরে সৎ ও নির্দিষ্ট থাকুন, মুখস্থ শোনাবেন না।",MEDIUM,"প্রেরণা|ব্যক্তিগত"`;

export default function InterviewAdminPage() {
  const qc = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const [catId, setCatId] = useState('');
  const [page, setPage] = useState(1);
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [res, setRes] = useState<ImportRes | null>(null);
  const [f, setF] = useState({ name: '', slug: '', icon: '', description: '' });

  const cats = useQuery({ queryKey: ['ivcats'], queryFn: () => api<Cat[]>('/admin/interview/categories') });
  const qs = useQuery({ queryKey: ['ivq', catId, page], queryFn: () => api<List>(`/admin/interview/questions?page=${page}${catId ? `&categoryId=${catId}` : ''}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['ivcats'] }); qc.invalidateQueries({ queryKey: ['ivq'] }); };
  const fail = (e: Error) => { setErr(e.message); setMsg(''); };

  const addCat = useMutation({
    mutationFn: () => api('/admin/interview/categories', { method: 'POST', json: { name: f.name, ...(f.slug && { slug: f.slug }), ...(f.icon && { icon: f.icon }), ...(f.description && { description: f.description }) } }),
    onSuccess: () => { setF({ name: '', slug: '', icon: '', description: '' }); setErr(''); setMsg('✔ ক্যাটাগরি যোগ হয়েছে'); refresh(); },
    onError: fail,
  });
  const imp = useMutation({
    mutationFn: () => api<ImportRes>('/admin/interview/import', { method: 'POST', json: { csv, defaultCategoryId: catId || undefined } }),
    onSuccess: (r) => { setRes(r); setErr(''); setMsg(`✔ ${bn(r.imported)}টি প্রশ্ন (অপ্রকাশিত) ইমপোর্ট হয়েছে${r.failed ? `, ${bn(r.failed)}টি বাদ গেছে` : ''}`); if (r.imported) setCsv(''); refresh(); },
    onError: fail,
  });
  const toggle = useMutation({ mutationFn: (v: { id: string; isPublished: boolean }) => api(`/admin/interview/questions/${v.id}`, { method: 'PATCH', json: { isPublished: v.isPublished } }), onSuccess: refresh, onError: fail });
  const del = useMutation({ mutationFn: (id: string) => api(`/admin/interview/questions/${id}`, { method: 'DELETE' }), onSuccess: refresh, onError: fail });
  const pubAll = useMutation({ mutationFn: () => api<{ published: number }>(`/admin/interview/categories/${catId}/publish-all`, { method: 'PATCH' }), onSuccess: (r) => { setMsg(`✔ ${bn(r.published)}টি প্রশ্ন প্রকাশ হয়েছে`); refresh(); }, onError: fail });

  return (
    <>
      <PageTitle title="🎤 ইন্টারভিউ প্রশ্ন" sub="ক্যাটাগরি বানান, CSV দিয়ে প্রশ্ন তুলুন, রিভিউ করে প্রকাশ করুন।" />
      {err && <ErrorBox message={err} />}{msg && <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{msg}</p>}

      <Card className="space-y-3">
        <h2 className="font-semibold">১. নতুন ক্যাটাগরি</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="নাম" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="যেমন: বিসিএস ভাইভা" />
          <Input label="slug (ইংরেজিতে, CSV-তে ব্যবহার হবে)" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="bcs-viva" />
          <Input label="আইকন (ইমোজি)" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} placeholder="🎓" maxLength={8} />
          <Input label="ছোট বর্ণনা" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <Button disabled={f.name.trim().length < 2 || addCat.isPending} onClick={() => addCat.mutate()}>ক্যাটাগরি যোগ করুন</Button>
        {cats.data && cats.data.length > 0 && (
          <ul className="divide-y divide-slate-100 text-sm">
            {cats.data.map((c) => <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{c.icon} <b>{c.name}</b> <span className="text-slate-400">({c.slug})</span></span><span>প্রকাশিত {bn(c.published)}/{bn(c.total)}</span></li>)}
          </ul>
        )}
      </Card>

      <Card className="mt-4 space-y-3">
        <h2 className="font-semibold">২. CSV ইমপোর্ট</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="ক্যাটাগরি (CSV-তে category_slug না থাকলে এটাই ধরা হবে)" value={catId} onChange={(e) => { setCatId(e.target.value); setPage(1); }}><option value="">— সব —</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <div className="flex items-end gap-2">
            <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) { setCsv(await fl.text()); setRes(null); } }} />
            <Button variant="outline" onClick={() => file.current?.click()}>📂 CSV ফাইল</Button>
            <Button variant="ghost" onClick={() => { setCsv(SAMPLE); setRes(null); }}>নমুনা দেখুন</Button>
          </div>
        </div>
        <Textarea label="CSV কনটেন্ট" value={csv} onChange={(e) => setCsv(e.target.value)} rows={7} className="font-mono text-sm" placeholder="category_slug,question,answer,tips,difficulty,tags" />
        <p className="text-xs text-slate-500">tags আলাদা করুন <code>|</code> দিয়ে। difficulty = EASY/MEDIUM/HARD। প্রশ্ন সবসময় অপ্রকাশিত অবস্থায় ঢোকে।</p>
        <Button disabled={!csv.trim() || imp.isPending} onClick={() => imp.mutate()}>{imp.isPending ? 'ইমপোর্ট হচ্ছে…' : 'ইমপোর্ট করুন'}</Button>
        {res && res.errors.length > 0 && (
          <ul className="space-y-1 text-sm">{res.errors.map((e) => <li key={e.line}><span className="text-slate-400">#{bn(e.line)}</span> {e.errors.map((x) => <Badge key={x} tone="red" className="ml-1">{x}</Badge>)}</li>)}</ul>
        )}
      </Card>

      <Card className="mt-4 !p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold">৩. রিভিউ ও প্রকাশ ({bn(qs.data?.total ?? 0)})</h2>
          {catId && <Button size="sm" variant="success" disabled={pubAll.isPending} onClick={() => { if (confirm('এই ক্যাটাগরির সব অপ্রকাশিত প্রশ্ন প্রকাশ করবেন?')) pubAll.mutate(); }}>এই ক্যাটাগরির সব প্রকাশ করুন</Button>}
        </div>
        <ul className="divide-y divide-slate-100">
          {qs.data?.items.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1"><span className="text-slate-400">{q.category.name} · </span>{trunc(q.question, 90)}</span>
              <span className="flex items-center gap-2">
                <Badge tone={q.isPublished ? 'green' : 'slate'}>{q.isPublished ? 'প্রকাশিত' : 'অপ্রকাশিত'}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: q.id, isPublished: !q.isPublished })}>{q.isPublished ? 'লুকান' : 'প্রকাশ'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm('প্রশ্নটি মুছে ফেলবেন?')) del.mutate(q.id); }}>🗑</Button>
              </span>
            </li>
          ))}
          {qs.data && !qs.data.items.length && <li className="px-4 py-6 text-center text-sm text-slate-500">কোনো প্রশ্ন নেই।</li>}
        </ul>
        {qs.data && qs.data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>← আগের</Button>
            <span>{bn(page)}/{bn(qs.data.totalPages)}</span>
            <Button size="sm" variant="outline" disabled={page >= qs.data.totalPages} onClick={() => setPage(page + 1)}>পরের →</Button>
          </div>
        )}
      </Card>
    </>
  );
}