'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn } from '@/lib/utils';
import { Button, Card, ErrorBox, Input, Select } from '@/components/ui';

type Plan = { id: string; name: string; priceBdt: number; durationDays: number; features: string[] };

export function PlanCards({ plans }: { plans: Plan[] }) {
  const [sel, setSel] = useState<Plan | null>(null);
  const user = useAuth((s) => s.user);
  const best = plans.length > 1 ? plans[1].id : plans[0]?.id;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={`flex flex-col ${p.id === best ? '!border-brand-500 ring-2 ring-brand-100' : ''}`}>
            {p.id === best && <span className="mb-2 w-fit rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">জনপ্রিয়</span>}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-2"><span className="text-4xl font-bold">৳{bn(p.priceBdt)}</span> <span className="text-slate-500">/ {bn(p.durationDays)} দিন</span></p>
            <ul className="mt-4 flex-1 space-y-1.5 text-[15px] text-slate-700">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <Button className="mt-5" variant={p.id === best ? 'primary' : 'outline'} onClick={() => setSel(p)}>এই প্ল্যান নিন</Button>
          </Card>
        ))}
      </div>
      {sel && (user ? <ManualPay plan={sel} onClose={() => setSel(null)} /> : <Card className="mx-auto mt-6 max-w-lg text-center"><p className="mb-3">পেমেন্ট করতে আগে লগইন করুন।</p><Link href="/login?next=/pricing" className="font-medium text-brand-700 hover:underline">লগইন করুন →</Link></Card>)}
    </>
  );
}

function ManualPay({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [provider, setProvider] = useState('BKASH');
  const [trx, setTrx] = useState('');
  const [num, setNum] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('busy'); setErr('');
    try { await api('/payments/manual', { method: 'POST', json: { planId: plan.id, provider, trxId: trx, senderNumber: num } }); setState('done'); }
    catch (x: any) { setErr(x.message); setState('idle'); }
  }
  if (state === 'done') return <Card className="mx-auto mt-6 max-w-lg text-center"><p className="text-lg font-semibold text-emerald-700">✅ পেমেন্ট তথ্য জমা হয়েছে</p><p className="mt-1 text-slate-600">যাচাই শেষে আপনার প্রিমিয়াম চালু হবে (সাধারণত কয়েক ঘণ্টার মধ্যে)।</p></Card>;
  return (
    <Card className="mx-auto mt-6 max-w-lg">
      <h3 className="text-lg font-semibold">{plan.name} – ৳{bn(plan.priceBdt)}</h3>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
        <li>bKash/Nagad-এ <b>Send Money</b> করুন: <b className="text-slate-900">01XXXXXXXXX</b> <span className="text-slate-400">(অ্যাডমিন নিজের নম্বর বসাবেন)</span></li>
        <li>পরিমাণ: ৳{bn(plan.priceBdt)}</li><li>নিচে TrxID ও যে নম্বর থেকে পাঠিয়েছেন তা লিখুন।</li>
      </ol>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Select label="মাধ্যম" value={provider} onChange={(e) => setProvider(e.target.value)}><option value="BKASH">bKash</option><option value="NAGAD">Nagad</option></Select>
        <Input label="TrxID" value={trx} onChange={(e) => setTrx(e.target.value)} required minLength={6} placeholder="যেমন: 9AB1C2D3E4" />
        <Input label="যে নম্বর থেকে পাঠিয়েছেন" value={num} onChange={(e) => setNum(e.target.value)} required pattern="01[3-9][0-9]{8}" inputMode="numeric" placeholder="01XXXXXXXXX" />
        {err && <ErrorBox message={err} />}
        <div className="flex gap-2"><Button type="submit" disabled={state === 'busy'}>জমা দিন</Button><Button type="button" variant="ghost" onClick={onClose}>বাতিল</Button></div>
      </form>
    </Card>
  );
}
