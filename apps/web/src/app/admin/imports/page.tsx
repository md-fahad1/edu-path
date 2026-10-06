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

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

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
  const chapter = chapters.find((c) => c.id === chapterId);

  const preview = useMutation({ mutationFn: () => api<Prev>('/admin/imports/preview', { method: 'POST', json: body }), onSuccess: (r) => { setPrev(r); setErr(''); setMsg(''); }, onError: (e: Error) => setErr(e.message) });
  const commit = useMutation({
    mutationFn: () => api<{ imported: number; failed: number }>('/admin/imports/commit', { method: 'POST', json: body }),
    onSuccess: (r) => { setMsg(`✔ ${bn(r.imported)}টি প্রশ্ন ড্রাফট হিসেবে ইমপোর্ট হয়েছে${r.failed ? `, ${bn(r.failed)}টি বাদ গেছে` : ''}। রিভিউ কিউ থেকে যাচাই করুন।`); setPrev(null); setCsv(''); qc.invalidateQueries({ queryKey: ['jobs'] }); },
    onError: (e: Error) => setErr(e.message),
  });
  async function onFile(f?: File | null) { if (f) { setCsv(await f.text()); setPrev(null); } }

  /** Nirbachito chapter-er jonno khali template (Excel-e bangla thik thakar jonno BOM shoho) */
  function downloadTemplate() {
    if (!chapter) return;
    const head = 'topic,question,option_a,option_b,option_c,option_d,correct,explanation,year,source,difficulty';
    const row = [csvCell(chapter.topics[0]?.name ?? ''), csvCell('এখানে প্রশ্ন লিখুন'), csvCell('অপশন ক'), csvCell('অপশন খ'), csvCell('অপশন গ'), csvCell('অপশন ঘ'), 'A', csvCell('ব্যাখ্যা (নিজের ভাষায়)'), '', csvCell('ঢাকা বোর্ড ২০২২'), 'MEDIUM'].join(',');
    const blob = new Blob(['\uFEFF' + head + '\n' + row + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${chapter.slug}-template.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageTitle title="CSV বাল্ক ইমপোর্ট" sub="সব প্রশ্ন DRAFT হিসেবে ঢোকে; কখনোই সরাসরি পাবলিশ হয় না।" />
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="১. চ্যাপ্টার বাছুন (একটা CSV = একটা চ্যাপ্টার)" value={chapterId} onChange={(e) => { setChapterId(e.target.value); setPrev(null); }}><option value="">—</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" disabled={!chapter} onClick={downloadTemplate} title={chapter ? '' : 'আগে চ্যাপ্টার বাছুন'}>⬇️ টেমপ্লেট নামান</Button>
            <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => file.current?.click()}>📂 CSV ফাইল বাছুন</Button>
            <Button variant="ghost" onClick={() => { setCsv(SAMPLE); setPrev(null); }}>নমুনা দেখুন</Button>
          </div>
        </div>

        {chapter && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold">এই চ্যাপ্টারের টপিক <span className="font-normal text-slate-500">(CSV-র <code>topic</code> কলামে হুবহু এই নাম লিখুন, না লিখলেও চলবে)</span></p>
            {chapter.topics.length
              ? <div className="mt-2 flex flex-wrap gap-1.5">{chapter.topics.map((t) => <button key={t.id} type="button" onClick={() => navigator.clipboard?.writeText(t.name)} title="কপি করতে চাপুন" className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs hover:border-brand-500">{t.name}</button>)}</div>
              : <p className="mt-1 text-slate-500">এই চ্যাপ্টারে এখনো কোনো টপিক নেই — topic কলাম ফাঁকা রাখুন।</p>}
            <p className="mt-2 text-xs text-slate-500">টেমপ্লেটের নমুনা সারিটি মুছে নিজের প্রশ্ন বসান। <code>correct</code> = A/B/C/D, <code>difficulty</code> = EASY/MEDIUM/HARD, গণিত/রসায়ন: <code>$x^2$</code>, <code>$\ce{'{H2O}'}$</code>।</p>
          </div>
        )}

        <Textarea label="২. CSV কনটেন্ট" value={csv} onChange={(e) => { setCsv(e.target.value); setPrev(null); }} rows={8} className="font-mono text-sm" placeholder="header: topic,question,option_a,option_b,option_c,option_d,correct,explanation,year,source,difficulty" />
        <div className="flex gap-2"><Button disabled={!csv.trim() || preview.isPending} onClick={() => preview.mutate()}>{preview.isPending ? 'যাচাই হচ্ছে…' : '৩. প্রিভিউ ও যাচাই'}</Button>{prev && prev.valid > 0 && <Button variant="success" disabled={commit.isPending} onClick={() => commit.mutate()}>{commit.isPending ? 'ইমপোর্ট হচ্ছে…' : `৪. ${bn(prev.valid)}টি ইমপোর্ট করুন`}</Button>}</div>
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