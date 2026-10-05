'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LETTERS, cn } from '@/lib/utils';
import { STATUS_BN, STATUS_TONE, useTree } from './admin';
import { Badge, Button, Card, ErrorBox, Input, Select, Textarea } from './ui';

export type QForm = { id?: string; text: string; explanation: string; difficulty: string; chapterId: string; topicId: string; year: string; source: string; options: { text: string; isCorrect: boolean }[]; status?: string };
export const blankQ = (): QForm => ({ text: '', explanation: '', difficulty: 'MEDIUM', chapterId: '', topicId: '', year: '', source: '', options: [0, 1, 2, 3].map(() => ({ text: '', isCorrect: false })) });

export function QuestionEditor({ initial }: { initial: QForm }) {
  const [f, setF] = useState<QForm>(initial);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const { chapters } = useTree();
  const topics = chapters.find((c) => c.id === f.chapterId)?.topics ?? [];
  const setOpt = (i: number, p: Partial<{ text: string; isCorrect: boolean }>) => setF({ ...f, options: f.options.map((o, j) => (j === i ? { ...o, ...p } : p.isCorrect ? { ...o, isCorrect: false } : o)) });

  async function save(then?: string) {
    setErr(''); setOk(''); setBusy(true);
    try {
      const body = { text: f.text, explanation: f.explanation || null, difficulty: f.difficulty, chapterId: f.chapterId, topicId: f.topicId || null, year: f.year ? Number(f.year) : null, source: f.source || null, options: f.options };
      let id = f.id;
      if (id) await api(`/admin/questions/${id}`, { method: 'PATCH', json: body });
      else { const r = await api<{ id: string }>('/admin/questions', { method: 'POST', json: { ...body, explanation: body.explanation ?? undefined, topicId: body.topicId ?? undefined, year: body.year ?? undefined, source: body.source ?? undefined } }); id = r.id; }
      if (then) await api(`/admin/questions/${id}/status`, { method: 'PATCH', json: { status: then } });
      qc.invalidateQueries({ queryKey: ['aq'] });
      if (f.id) { setOk('সেভ হয়েছে ✔'); if (then) setF({ ...f, status: then }); } else router.replace(`/admin/questions/${id}`);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const complete = f.text.trim().length >= 3 && f.chapterId && f.options.every((o) => o.text.trim()) && f.options.filter((o) => o.isCorrect).length === 1;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <Card className="space-y-4">
          <Textarea label="প্রশ্ন *" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} rows={3} />
          <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">অপশন (সঠিকটির পাশে টিক দিন) *</legend>
            <div className="space-y-2">{f.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold">{LETTERS[i]}</span>
                <input className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} aria-label={`অপশন ${LETTERS[i]}`} />
                <label className={cn('flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm', o.isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500')}><input type="radio" name="correct" checked={o.isCorrect} onChange={() => setOpt(i, { isCorrect: true })} />সঠিক</label>
              </div>))}</div>
          </fieldset>
          <Textarea label="ব্যাখ্যা (নিজের ভাষায়, ২–৪ লাইন)" value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} rows={3} />
        </Card>
        {err && <ErrorBox message={err} />}{ok && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{ok}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !complete} onClick={() => save()}>{f.id ? 'সেভ করুন' : 'ড্রাফট হিসেবে তৈরি করুন'}</Button>
          {f.id && <Button variant="outline" disabled={busy || !complete} onClick={() => save('REVIEWED')}>সেভ + Reviewed</Button>}
          {f.id && role === 'ADMIN' && <Button variant="success" disabled={busy || !complete} onClick={() => save('PUBLISHED')}>সেভ + Publish</Button>}
          {f.id && f.status && f.status !== 'ARCHIVED' && <Button variant="danger" disabled={busy} onClick={() => save('ARCHIVED')}>আর্কাইভ</Button>}
        </div>
      </div>
      <div className="space-y-4">
        <Card className="space-y-3">
          {f.status && <p className="text-sm">বর্তমান স্ট্যাটাস: <Badge tone={STATUS_TONE[f.status]}>{STATUS_BN[f.status]}</Badge></p>}
          <Select label="চ্যাপ্টার *" value={f.chapterId} onChange={(e) => setF({ ...f, chapterId: e.target.value, topicId: '' })}><option value="">— বাছুন —</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
          <Select label="টপিক" value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}><option value="">—</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          <Select label="কঠিনতা" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="EASY">সহজ</option><option value="MEDIUM">মাঝারি</option><option value="HARD">কঠিন</option></Select>
          <Input label="সাল" type="number" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} placeholder="2022" />
          <Input label="উৎস" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="ঢাকা বোর্ড ২০২২" />
        </Card>
        <Card className="!bg-slate-50 text-sm text-slate-600"><p className="font-semibold text-slate-800">প্রিভিউ</p><p className="mt-1">{f.text || '—'}</p><ul className="mt-2 space-y-1">{f.options.map((o, i) => <li key={i} className={o.isCorrect ? 'font-semibold text-emerald-700' : ''}>{LETTERS[i]}. {o.text || '…'}</li>)}</ul></Card>
      </div>
    </div>
  );
}
