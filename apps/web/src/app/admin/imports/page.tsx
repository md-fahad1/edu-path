'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { bn, trunc } from '@/lib/utils';
import { useTree } from '@/components/admin';
import { Badge, Button, Card, ErrorBox, PageTitle, Select, Textarea } from '@/components/ui';

type Prev = { total: number; valid: number; rows: { line: number; errors: string[]; text: string; options: { label: string; text: string; isCorrect: boolean }[] }[] };
const SAMPLE = `chapter_slug,topic_slug,question,option_a,option_b,option_c,option_d,correct,explanation,year,source,difficulty
chapter-3-number-system,number-systems,"বাইনারি সংখ্যা পদ্ধতির ভিত্তি কত?","২","৮","১০","১৬",A,"বাইনারিতে শুধু ০ ও ১ ব্যবহৃত হয়।",2022,"ঢাকা বোর্ড ২০২২",EASY`;

export default function ImportsPage() {
  const [csv, setCsv] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [prev, setPrev] = useState<Prev | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const { chapters } = useTree();
  const qc = useQueryClient();
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => api<any[]>('/admin/imports') });
  const body = { csv, defaultChapterId: chapterId || undefined };
  const preview = useMutation({ mutationFn: () => api<Prev>('/admin/imports/preview', { method: 'POST', json: body }), onSuccess: (r) => { setPrev(r); setErr(''); setMsg(''); }, onError: (e: Error) => setErr(e.message) });
  const commit = useMutation({
    mutationFn: () => api<{ imported: number; failed: number }>('/admin/imports/commit', { method: 'POST', json: body }),
    onSuccess: (r) => { setMsg(`✔ ${bn(r.imported)}টি প্রশ্ন ড্রাফট হিসেবে ইমপোর্ট হয়েছে${r.failed ? `, ${bn(r.failed)}টি বাদ গেছে` : ''}। রিভিউ কিউ থেকে যাচাই করুন।`); setPrev(null); setCsv(''); qc.invalidateQueries({ queryKey: ['jobs'] }); },
    onError: (e: Error) => setErr(e.message),
  });
  async function onFile(f?: File | null) { if (f) { setCsv(await f.text()); setPrev(null); } }

  return (
    <>
      <PageTitle title="CSV বাল্ক ইমপোর্ট" sub="সব প্রশ্ন DRAFT হিসেবে ঢোকে; কখনোই সরাসরি পাবলিশ হয় না।" />
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="ডিফল্ট চ্যাপ্টার (CSV-তে chapter_slug না থাকলে)" value={chapterId} onChange={(e) => setChapterId(e.target.value)}><option value="">—</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
          <div className="flex items-end gap-2"><input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /><Button variant="outline" onClick={() => file.current?.click()}>📂 CSV ফাইল বাছুন</Button><Button variant="ghost" onClick={() => { setCsv(SAMPLE); setPrev(null); }}>নমুনা দেখুন</Button></div>
        </div>
        <Textarea label="CSV কনটেন্ট" value={csv} onChange={(e) => { setCsv(e.target.value); setPrev(null); }} rows={8} className="font-mono text-sm" placeholder="header: chapter_slug,topic_slug,question,option_a,option_b,option_c,option_d,correct,explanation,year,source,difficulty" />
        <div className="flex gap-2"><Button disabled={!csv.trim() || preview.isPending} onClick={() => preview.mutate()}>{preview.isPending ? 'যাচাই হচ্ছে…' : '১. প্রিভিউ ও যাচাই'}</Button>{prev && prev.valid > 0 && <Button variant="success" disabled={commit.isPending} onClick={() => commit.mutate()}>{commit.isPending ? 'ইমপোর্ট হচ্ছে…' : `২. ${bn(prev.valid)}টি ইমপোর্ট করুন`}</Button>}</div>
        {err && <ErrorBox message={err} />}{msg && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{msg}</p>}
      </Card>
      {prev && (
        <Card className="mt-4 overflow-x-auto !p-0">
          <p className="border-b border-slate-100 px-4 py-3 text-sm"><b>{bn(prev.total)}</b> সারি · <span className="text-emerald-600">সঠিক {bn(prev.valid)}</span> · <span className="text-rose-600">ত্রুটি {bn(prev.total - prev.valid)}</span></p>
          <table className="w-full min-w-[34rem] text-left text-sm"><tbody>{prev.rows.map((r) => (
            <tr key={r.line} className="border-t border-slate-100 align-top"><td className="px-4 py-2.5 text-slate-400">#{bn(r.line)}</td><td className="py-2.5 pr-3">{trunc(r.text, 80)}</td><td className="py-2.5 pr-3">{r.errors.length ? <div className="flex flex-wrap gap-1">{r.errors.map((e) => <Badge key={e} tone="red">{e}</Badge>)}</div> : <Badge tone="green">ঠিক আছে</Badge>}</td></tr>))}</tbody></table>
        </Card>
      )}
      <Card className="mt-4">
        <h2 className="mb-2 font-semibold">সাম্প্রতিক ইমপোর্ট</h2>
        {jobs.data?.length ? <ul className="divide-y divide-slate-100 text-sm">{jobs.data.map((j) => <li key={j.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{new Date(j.createdAt).toLocaleString('bn-BD')} · {j.createdBy.name}</span><span>সফল {bn(j.successRows)} · ব্যর্থ {bn(j.failedRows)} <Badge tone={j.status === 'COMPLETED' ? 'green' : 'red'}>{j.status}</Badge></span></li>)}</ul> : <p className="text-sm text-slate-500">এখনো কোনো ইমপোর্ট হয়নি।</p>}
      </Card>
    </>
  );
}
