'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, ErrorBox, Input } from '@/components/ui';

function Form() {
  const token = useSearchParams().get('token') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
    if (pw !== pw2) return setErr('দুটি পাসওয়ার্ড মিলছে না।');
    setBusy(true);
    try { await api('/auth/reset-password', { method: 'POST', json: { token, password: pw } }); setDone(true); }
    catch (x: any) { setErr(x.message); }
    finally { setBusy(false); }
  }

  if (!token) {
    return (
      <Card className="mx-auto max-w-md !p-6 text-center">
        <p className="text-slate-700">লিংকটি সঠিক নয়।</p>
        <Link href="/forgot-password" className="mt-3 inline-block font-medium text-brand-700 hover:underline">নতুন লিংক চান →</Link>
      </Card>
    );
  }
  if (done) {
    return (
      <Card className="mx-auto max-w-md !p-6 text-center">
        <div className="text-4xl">✅</div>
        <h1 className="mt-2 text-xl font-bold">পাসওয়ার্ড বদলানো হয়েছে</h1>
        <p className="mt-2 text-slate-600">নিরাপত্তার জন্য সব ডিভাইস থেকে লগআউট করা হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।</p>
        <Link href="/login" className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">লগইন করুন</Link>
      </Card>
    );
  }
  return (
    <Card className="mx-auto max-w-md !p-6">
      <h1 className="text-2xl font-bold">নতুন পাসওয়ার্ড দিন</h1>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Input label="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        <Input label="পাসওয়ার্ড আবার লিখুন" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
        {err && <ErrorBox message={err} />}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : 'পাসওয়ার্ড বদলান'}</Button>
      </form>
    </Card>
  );
}
export default function ResetPasswordPage() { return <Suspense><Form /></Suspense>; }