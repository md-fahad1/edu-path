'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Card, ErrorBox, Input } from '@/components/ui';

function Form() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const login = useAuth((s) => s.login);
  const router = useRouter();
  const next = useSearchParams().get('next');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await login(id, pw); router.replace(next && next.startsWith('/') ? next : '/dashboard'); }
    catch (x: any) { setErr(x.message); setBusy(false); }
  }
  return (
    <Card className="mx-auto max-w-md !p-6">
      <h1 className="text-2xl font-bold">লগইন</h1>
      <p className="mt-1 text-slate-600">আপনার প্রগ্রেস ও ড্যাশবোর্ড দেখতে লগইন করুন।</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Input label="ইমেইল বা মোবাইল নম্বর" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" required />
        <Input label="পাসওয়ার্ড" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
        {err && <ErrorBox message={err} />}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : 'লগইন'}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">অ্যাকাউন্ট নেই? <Link href="/register" className="font-medium text-brand-700 hover:underline">রেজিস্টার করুন</Link></p>
    </Card>
  );
}
export default function LoginPage() { return <Suspense><Form /></Suspense>; }
