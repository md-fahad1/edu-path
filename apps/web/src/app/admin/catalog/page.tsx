'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useTree } from '@/components/admin';
import { Badge, Button, Card, ErrorBox, Input, Loading, PageTitle, Select } from '@/components/ui';

type Ent = 'categories' | 'subjects' | 'chapters' | 'topics' | 'exams';
const TABS: { k: Ent; label: string; parent?: { key: string; ent: Ent; label: string } }[] = [
  { k: 'categories', label: 'ক্যাটাগরি' }, { k: 'subjects', label: 'বিষয়', parent: { key: 'categoryId', ent: 'categories', label: 'ক্যাটাগরি' } },
  { k: 'chapters', label: 'চ্যাপ্টার', parent: { key: 'subjectId', ent: 'subjects', label: 'বিষয়' } }, { k: 'topics', label: 'টপিক', parent: { key: 'chapterId', ent: 'chapters', label: 'চ্যাপ্টার' } },
  { k: 'exams', label: 'পরীক্ষা/সেট', parent: { key: 'categoryId', ent: 'categories', label: 'ক্যাটাগরি' } },
];

export default function CatalogPage() {
  const [tab, setTab] = useState<Ent>('categories');
  const t = TABS.find((x) => x.k === tab)!;
  return (
    <>
      <PageTitle title="ক্যাটালগ ম্যানেজমেন্ট" sub="ক্যাটাগরি → বিষয় → চ্যাপ্টার → টপিক। স্লাগ একবার তৈরির পর বদলাবেন না (URL ও SEO ঠিক রাখতে)।" />
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">{TABS.map((x) => <Button key={x.k} size="sm" variant={x.k === tab ? 'primary' : 'outline'} onClick={() => setTab(x.k)} className="shrink-0">{x.label}</Button>)}</div>
      <Manager key={tab} tab={t} />
    </>
  );
}

function Manager({ tab }: { tab: (typeof TABS)[number] }) {
  const qc = useQueryClient();
  const tree = useTree();
  const [parentId, setParentId] = useState('');
  const [form, setForm] = useState<Record<string, any>>({ name: '', slug: '', order: 0, year: new Date().getFullYear(), conductor: '', summary: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const parents = useQuery({ queryKey: ['cat', tab.parent?.ent], queryFn: () => api<any[]>(`/admin/catalog/${tab.parent!.ent}`), enabled: !!tab.parent });
  const list = useQuery({ queryKey: ['cat', tab.k, parentId], queryFn: () => api<any[]>(`/admin/catalog/${tab.k}${parentId ? `?parentId=${parentId}` : ''}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['cat'] }); qc.invalidateQueries({ queryKey: ['tree'] }); };
  const reset = () => { setEditId(null); setForm({ name: '', slug: '', order: 0, year: new Date().getFullYear(), conductor: '', summary: '' }); };
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { name: form.name, slug: form.slug || undefined, order: Number(form.order) || 0 };
      if (tab.parent) body[tab.parent.key] = parentId;
      if (tab.k === 'categories') body.description = form.description ?? '';
      if (tab.k === 'chapters') { body.summary = form.summary; body.isPremium = !!form.isPremium; }
      if (tab.k === 'exams') { body.year = Number(form.year); body.conductor = form.conductor; body.answerKeyOfficial = !!form.answerKeyOfficial; delete body.order; }
      return editId ? api(`/admin/catalog/${tab.k}/${editId}`, { method: 'PATCH', json: body }) : api(`/admin/catalog/${tab.k}`, { method: 'POST', json: body });
    },
    onSuccess: () => { reset(); refresh(); setErr(''); }, onError: (e: Error) => setErr(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => api(`/admin/catalog/${tab.k}/${id}`, { method: 'DELETE' }), onSuccess: refresh, onError: (e: Error) => setErr(e.message) });
  const toggle = useMutation({ mutationFn: (r: any) => api(`/admin/catalog/${tab.k}/${r.id}`, { method: 'PATCH', json: { isActive: !r.isActive } }), onSuccess: refresh });
  const needParent = !!tab.parent && !parentId;
  void tree;

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <Card className="space-y-3 self-start">
        <p className="font-semibold">{editId ? 'সম্পাদনা' : 'নতুন যোগ করুন'}</p>
        {tab.parent && (
          <Select label={`${tab.parent.label} (ফিল্টার/প্যারেন্ট)`} value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">— বাছুন —</option>{parents.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        )}
        <Input label="নাম *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="স্লাগ (ইংরেজি, খালি রাখলে অটো)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="chapter-3-number-system" />
        {tab.k !== 'exams' && <Input label="ক্রম" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />}
        {tab.k === 'categories' && <Input label="বিবরণ" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        {tab.k === 'chapters' && (<><Input label="সারসংক্ষেপ (SEO)" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} />প্রিমিয়াম চ্যাপ্টার</label></>)}
        {tab.k === 'exams' && (<><Input label="সাল" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /><Input label="পরিচালনাকারী (BPSC, DU…)" value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.answerKeyOfficial} onChange={(e) => setForm({ ...form, answerKeyOfficial: e.target.checked })} />অফিসিয়াল উত্তরমালা আছে</label></>)}
        {err && <ErrorBox message={err} />}
        <div className="flex gap-2"><Button disabled={!form.name || needParent || save.isPending} onClick={() => save.mutate()}>{editId ? 'আপডেট' : 'যোগ করুন'}</Button>{editId && <Button variant="ghost" onClick={reset}>বাতিল</Button>}</div>
        {needParent && <p className="text-xs text-amber-700">আগে উপরের ড্রপডাউন থেকে {tab.parent!.label} বাছুন।</p>}
      </Card>
      <Card className="!p-0">
        {list.isLoading ? <Loading /> : !list.data?.length ? <p className="p-6 text-center text-slate-500">কিছু নেই</p> : (
          <ul className="divide-y divide-slate-100">{list.data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{r.name} {r.isActive === false && <Badge tone="red">নিষ্ক্রিয়</Badge>} {r.isPremium && <Badge tone="amber">প্রিমিয়াম</Badge>}</p><p className="truncate text-xs text-slate-500">/{r.slug}{r.year ? ` · ${r.year}` : ''}</p></div>
              <Button size="sm" variant="ghost" onClick={() => { setEditId(r.id); setForm({ ...r, summary: r.summary ?? '', conductor: r.conductor ?? '' }); if (tab.parent) setParentId(r[tab.parent.key]); }}>এডিট</Button>
              {'isActive' in r && <Button size="sm" variant="ghost" onClick={() => toggle.mutate(r)}>{r.isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}</Button>}
              <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => confirm('মুছে ফেলবেন? (নিচে ডেটা থাকলে মুছবে না)') && del.mutate(r.id)}>মুছুন</Button></li>))}</ul>
        )}
      </Card>
    </div>
  );
}
