'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Card, ErrorBox, Input } from '@/components/ui';

export default function RegisterPage() {
  const [f, setF] = useState({ name: '', contact: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const register = useAuth((s) => s.register);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const isEmail = f.contact.includes('@');
    try {
      await register({ name: f.name, password: f.password, ...(isEmail ? { email: f.contact.trim() } : { phone: f.contact.trim() }) });
      router.replace('/dashboard');
    } catch (x: any) { setErr(x.message); setBusy(false); }
  }
  return (
    <Card className="mx-auto max-w-md !p-6">
      <h1 className="text-2xl font-bold">নতুন অ্যাকাউন্ট</h1>
      <p className="mt-1 text-slate-600">ফ্রি রেজিস্টার করে আপনার অগ্রগতি ও দুর্বল টপিক ট্র্যাক করুন।</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Input label="আপনার নাম" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} autoComplete="name" />
        <Input label="ইমেইল বা মোবাইল (01XXXXXXXXX)" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} required autoComplete="username" />
        <Input label="পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} autoComplete="new-password" />
        {err && <ErrorBox message={err} />}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : 'রেজিস্টার'}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">আগেই অ্যাকাউন্ট আছে? <Link href="/login" className="font-medium text-brand-700 hover:underline">লগইন</Link></p>
    </Card>
  );
}
