'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DIFF_BN, LETTERS, cn } from '@/lib/utils';
import type { Question } from '@/lib/types';
import { Badge, Button, ErrorBox, Select, Textarea } from './ui';
import { toast } from '@/lib/toast';
import { RichText } from './RichText';

/** Practice-style card: option chap dile shathe shathe shothik uttor + byakkha dekhay */
export function QuestionCard({ q, no, link = true, initiallyOpen = false }: { q: Question; no?: number; link?: boolean; initiallyOpen?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(initiallyOpen);
  const [marked, setMarked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const open = revealed || !!picked;

  async function pick(id: string) {
    if (picked) return;
    setPicked(id);
    if (user) {
      api<{ notebook?: { event?: string | null } | null }>('/practice/answer', { method: 'POST', json: { questionId: q.id, optionId: id } })
        .then((r) => {
          const ev = r?.notebook?.event;
          if (ev === 'added') toast.info('📓 নোটবুকে যোগ হয়েছে, পরে আবার দেখাব');
          if (ev === 'mastered') toast.success('🎉 শিখে ফেলেছেন! নোটবুক থেকে সরানো হলো');
        })
        .catch(() => undefined);
    }
  }
  async function bookmark() {
    const r = await api<{ bookmarked: boolean }>(`/bookmarks/${q.id}`, { method: 'POST' }).catch(() => null);
    if (r) {
      setMarked(r.bookmarked);
      toast.success(r.bookmarked ? 'বুকমার্ক করা হয়েছে' : 'বুকমার্ক সরানো হয়েছে');
    } else toast.error('বুকমার্ক করা যায়নি, আবার চেষ্টা করুন');
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {no !== undefined && <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">{no}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-snug text-slate-900">{link ? <Link href={`/mcq/${q.slug}`} className="hover:text-brand-700"><RichText text={q.text} /></Link> : <RichText text={q.text} />}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {q.topic && <Badge tone="blue">{q.topic.name}</Badge>}
            {q.difficulty && <Badge tone={q.difficulty === 'HARD' ? 'red' : q.difficulty === 'EASY' ? 'green' : 'amber'}>{DIFF_BN[q.difficulty]}</Badge>}
            {q.source && <Badge>{q.source}</Badge>}
          </div>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2" role="list">
        {q.options.map((o, i) => {
          const isPicked = picked === o.id;
          const state = !open ? 'idle' : o.isCorrect ? 'right' : isPicked ? 'wrong' : 'dim';
          return (
            <li key={o.id}>
              <button
                type="button" onClick={() => pick(o.id)} disabled={open} aria-pressed={isPicked}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] transition-colors',
                  state === 'idle' && 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 active:bg-brand-50',
                  state === 'right' && 'border-emerald-400 bg-emerald-50 text-emerald-900',
                  state === 'wrong' && 'border-rose-400 bg-rose-50 text-rose-900',
                  state === 'dim' && 'border-slate-200 bg-white text-slate-500',
                )}
              >
                <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold', state === 'right' ? 'bg-emerald-500 text-white' : state === 'wrong' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600')}>{LETTERS[i]}</span>
                <RichText className="pt-px" text={o.text} />
                {state === 'right' && <span className="sr-only"> (সঠিক উত্তর)</span>}
                {state === 'wrong' && <span className="sr-only"> (আপনার ভুল উত্তর)</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-[15px]" aria-live="polite">
          <p className="font-semibold text-emerald-700">সঠিক উত্তর: {LETTERS[q.options.findIndex((o) => o.isCorrect)]}. <RichText text={q.options.find((o) => o.isCorrect)?.text} /></p>
          {picked && <p className={cn('mt-0.5 text-sm', q.options.find((o) => o.id === picked)?.isCorrect ? 'text-emerald-700' : 'text-rose-600')}>{q.options.find((o) => o.id === picked)?.isCorrect ? '✔ আপনার উত্তর সঠিক!' : '✘ আপনার উত্তর ভুল হয়েছে'}</p>}
          {q.explanation && <p className="mt-2 text-slate-700"><b>ব্যাখ্যা:</b> <RichText text={q.explanation} /></p>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
        {!open && <button className="rounded-lg px-2.5 py-1.5 font-medium text-brand-700 hover:bg-brand-50" onClick={() => setRevealed(true)}>উত্তর দেখুন</button>}
        <button
          type="button" aria-pressed={marked}
          className={cn('rounded-lg px-2.5 py-1.5 font-medium hover:bg-slate-100', marked ? 'text-amber-600' : 'text-slate-600')}
          onClick={user ? bookmark : () => toast.info('বুকমার্ক করতে আগে লগইন করুন')}
        >{marked ? '★ বুকমার্ক করা' : '☆ বুকমার্ক'}</button>
        <button className="rounded-lg px-2.5 py-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setReportOpen((v) => !v)} aria-expanded={reportOpen}>⚑ ভুল রিপোর্ট</button>
      </div>
      {reportOpen && <ReportForm id={q.id} onDone={() => setReportOpen(false)} />}
    </article>
  );
}

function ReportForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [reason, setReason] = useState('WRONG_ANSWER');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  async function send() {
    setState('busy'); setErr('');
    try { await api(`/questions/${id}/report`, { method: 'POST', json: { reason, note: note || undefined } }); setState('done'); toast.success('রিপোর্ট জমা হয়েছে, ধন্যবাদ!'); setTimeout(onDone, 1200); }
    catch (e: any) { setErr(e.message); setState('idle'); }
  }
  if (state === 'done') return <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">ধন্যবাদ! রিপোর্ট জমা হয়েছে, আমরা যাচাই করব।</p>;
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 p-3">
      <Select label="সমস্যা কী?" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="WRONG_ANSWER">উত্তর ভুল</option><option value="TYPO">বানান/টাইপো</option><option value="OUTDATED">তথ্য পুরনো</option><option value="OTHER">অন্য কিছু</option>
      </Select>
      <Textarea label="বিস্তারিত (ঐচ্ছিক)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
      {err && <ErrorBox message={err} />}
      <div className="flex gap-2"><Button size="sm" onClick={send} disabled={state === 'busy'}>জমা দিন</Button><Button size="sm" variant="ghost" onClick={onDone}>বাতিল</Button></div>
    </div>
  );
}