'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, ErrorBox, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await api('/auth/forgot-password', { method: 'POST', json: { email: email.trim() } });
      setSent(true);
    } catch (x: any) { setErr(x.message); }
    finally { setBusy(false); }
  }

  if (sent) {
    return (
      <Card className="mx-auto max-w-md !p-6 text-center">
        <div className="text-4xl">📧</div>
        <h1 className="mt-2 text-xl font-bold">ইমেইল চেক করুন</h1>
        <p className="mt-2 text-slate-600">যদি <b>{email}</b> ঠিকানায় কোনো অ্যাকাউন্ট থাকে, তাহলে পাসওয়ার্ড রিসেটের লিংক পাঠানো হয়েছে। লিংকটি ৩০ মিনিট পর্যন্ত কাজ করবে। ইনবক্সে না পেলে স্প্যাম ফোল্ডার দেখুন।</p>
        <Link href="/login" className="mt-4 inline-block font-medium text-brand-700 hover:underline">← লগইনে ফিরে যান</Link>
      </Card>
    );
  }
  return (
    <Card className="mx-auto max-w-md !p-6">
      <h1 className="text-2xl font-bold">পাসওয়ার্ড ভুলে গেছেন?</h1>
      <p className="mt-1 text-slate-600">রেজিস্টার করা ইমেইল দিন, আমরা রিসেটের লিংক পাঠাব।</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Input label="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        {err && <ErrorBox message={err} />}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : 'রিসেট লিংক পাঠান'}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600"><Link href="/login" className="font-medium text-brand-700 hover:underline">← লগইনে ফিরে যান</Link></p>
    </Card>
  );
}