'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRequireAuth } from '@/components/useRequireAuth';
import { toast } from '@/lib/toast';
import { bn } from '@/lib/utils';
import { Badge, Button, Card, ErrorBox, Input, LinkButton, Loading, PageTitle } from '@/components/ui';

type Me = {
  id: string; name: string; email: string | null; phone: string | null; role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isPremium: boolean; targetCategory: string | null; dailyGoal: number; onboarded: boolean;
};
type Sub = { active: boolean; subscription: { endsAt: string; plan: { name: string } } | null };
type Cat = { slug: string; name: string };

const ROLE_BN = { STUDENT: 'শিক্ষার্থী', TEACHER: 'শিক্ষক', ADMIN: 'অ্যাডমিন' } as const;

export function ProfileClient() {
  const { allowed } = useRequireAuth();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/users/me'), enabled: allowed });
  const sub = useQuery({ queryKey: ['sub'], queryFn: () => api<Sub>('/subscriptions/me'), enabled: allowed });
  const cats = useQuery({ queryKey: ['cats'], queryFn: () => api<Cat[]>('/categories'), enabled: allowed });
  if (!allowed || me.isLoading || !me.data) return <Loading />;
  const u = me.data;
  const catName = cats.data?.find((c) => c.slug === u.targetCategory)?.name;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="আমার প্রোফাইল" />

      <Card className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white">{u.name.trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{u.name}</p>
          <p className="truncate text-sm text-slate-500">{u.email || u.phone}</p>
          <div className="mt-1 flex gap-1.5"><Badge tone="blue">{ROLE_BN[u.role]}</Badge>{u.isPremium && <Badge tone="amber">👑 প্রিমিয়াম</Badge>}</div>
        </div>
      </Card>

      <InfoForm u={u} />

      <Card>
        <h2 className="font-semibold">🎯 আমার প্রস্তুতি</h2>
        <p className="mt-1 text-slate-600">
          {catName ? <>পরীক্ষা: <b>{catName}</b> · দৈনিক লক্ষ্য: <b>{bn(u.dailyGoal)}টি প্রশ্ন</b></> : 'এখনো পরীক্ষা বা দৈনিক লক্ষ্য সেট করা হয়নি।'}
        </p>
        <LinkButton href="/onboarding" variant="outline" size="sm" className="mt-3">{catName ? 'বদলান' : 'এখন সেট করুন'}</LinkButton>
      </Card>

      <Card>
        <h2 className="font-semibold">👑 প্রিমিয়াম</h2>
        {sub.data?.active && sub.data.subscription ? (
          <p className="mt-1 text-slate-600">প্ল্যান: <b>{sub.data.subscription.plan.name}</b> · মেয়াদ শেষ: <b>{new Date(sub.data.subscription.endsAt).toLocaleDateString('bn-BD')}</b></p>
        ) : u.role === 'ADMIN' ? (
          <p className="mt-1 text-slate-600">অ্যাডমিন হিসেবে সব প্রিমিয়াম কনটেন্ট খোলা আছে।</p>
        ) : (
          <>
            <p className="mt-1 text-slate-600">প্রিমিয়াম নিলে সব প্রিমিয়াম মডেল টেস্ট ও চ্যাপ্টার খুলে যাবে।</p>
            <LinkButton href="/pricing" size="sm" className="mt-3">প্ল্যান দেখুন</LinkButton>
          </>
        )}
      </Card>

      <PasswordForm />
      <DeleteZone role={u.role} />
    </div>
  );
}

function InfoForm({ u }: { u: Me }) {
  const qc = useQueryClient();
  const [name, setName] = useState(u.name);
  const [phone, setPhone] = useState(u.phone ?? '');
  const changed = name.trim() !== u.name || phone.trim() !== (u.phone ?? '');

  const m = useMutation({
    mutationFn: (b: { name: string; phone?: string }) => api<Me>('/users/me', { method: 'PATCH', json: b }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['me'] });
      useAuth.setState((s) => ({ user: s.user ? { ...s.user, name: d.name, phone: d.phone } : s.user }));
      toast.success('প্রোফাইল আপডেট হয়েছে');
    },
    onError: (e: any) => toast.error(e?.message || 'আপডেট করা যায়নি'),
  });

  return (
    <Card>
      <h2 className="mb-3 font-semibold">ব্যক্তিগত তথ্য</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); m.mutate({ name: name.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) }); }}
      >
        <Input label="নাম" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
        <Input label="মোবাইল নম্বর (01XXXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="01XXXXXXXXX" />
        <Input label="ইমেইল" value={u.email ?? 'দেওয়া হয়নি'} disabled readOnly />
        <p className="-mt-2 text-xs text-slate-500">ইমেইল পরিবর্তনের সুবিধা পরে আসবে।</p>
        <Button type="submit" disabled={!changed || m.isPending}>{m.isPending ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [rep, setRep] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (nw.length < 8) return setErr('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
    if (nw !== rep) return setErr('নতুন পাসওয়ার্ড দুটি মিলছে না');
    setBusy(true);
    try {
      // access token fresh kore nei, jeno 401 na khai
      if (!(await useAuth.getState().refresh())) { setErr('সেশন শেষ হয়ে গেছে, আবার লগইন করুন'); return; }
      const d = await api<{ accessToken: string; user: any }>('/auth/change-password', { method: 'POST', json: { currentPassword: cur, newPassword: nw } });
      useAuth.setState({ token: d.accessToken, user: d.user });
      setCur(''); setNw(''); setRep('');
      toast.success('পাসওয়ার্ড বদলানো হয়েছে। অন্য ডিভাইস থেকে লগআউট হয়ে গেছে।');
    } catch (x: any) { setErr(x?.message || 'পাসওয়ার্ড বদলানো যায়নি'); }
    finally { setBusy(false); }
  }

  const type = show ? 'text' : 'password';
  return (
    <Card>
      <h2 className="mb-3 font-semibold">🔒 পাসওয়ার্ড পরিবর্তন</h2>
      <form onSubmit={submit} className="space-y-4">
        <Input label="বর্তমান পাসওয়ার্ড" type={type} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
        <Input label="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" type={type} value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" required minLength={8} />
        <Input label="নতুন পাসওয়ার্ড আবার লিখুন" type={type} value={rep} onChange={(e) => setRep(e.target.value)} autoComplete="new-password" required />
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> পাসওয়ার্ড দেখান</label>
        {err && <ErrorBox message={err} />}
        <Button type="submit" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : 'পাসওয়ার্ড বদলান'}</Button>
      </form>
    </Card>
  );
}

function DeleteZone({ role }: { role: Me['role'] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [sure, setSure] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api('/users/me/delete', { method: 'POST', json: { password: pw } });
      await useAuth.getState().logout();
      toast.success('আপনার অ্যাকাউন্ট মুছে ফেলা হয়েছে');
      router.replace('/');
    } catch (x: any) { setErr(x?.message || 'মোছা যায়নি'); setBusy(false); }
  }

  return (
    <Card className="!border-rose-200">
      <h2 className="font-semibold text-rose-700">⚠️ বিপজ্জনক এলাকা</h2>
      {role === 'ADMIN' ? (
        <p className="mt-1 text-sm text-slate-600">অ্যাডমিন অ্যাকাউন্ট এখান থেকে মোছা যায় না।</p>
      ) : !open ? (
        <>
          <p className="mt-1 text-sm text-slate-600">অ্যাকাউন্ট মুছে ফেললে আপনার অগ্রগতি, বুকমার্ক ও টেস্ট ইতিহাস স্থায়ীভাবে মুছে যাবে।</p>
          <Button variant="outline" size="sm" className="mt-3 !border-rose-300 !text-rose-600" onClick={() => setOpen(true)}>অ্যাকাউন্ট মুছতে চাই</Button>
        </>
      ) : (
        <form onSubmit={remove} className="mt-2 space-y-4">
          <ul className="list-inside list-disc text-sm text-slate-600">
            <li>অগ্রগতি, স্ট্রিক, বুকমার্ক ও টেস্টের ফলাফল মুছে যাবে</li>
            <li>সক্রিয় প্রিমিয়াম থাকলে তা বাতিল হবে</li>
            <li>এটা আর ফেরানো যাবে না</li>
          </ul>
          <Input label="নিশ্চিত করতে আপনার পাসওয়ার্ড দিন" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={sure} onChange={(e) => setSure(e.target.checked)} /> আমি বুঝেছি, আমার অ্যাকাউন্ট ও ডেটা মুছে যাবে।</label>
          {err && <ErrorBox message={err} />}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={!sure || !pw || busy}>{busy ? 'মোছা হচ্ছে…' : 'চিরতরে মুছে ফেলুন'}</Button>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setPw(''); setSure(false); setErr(''); }}>বাতিল</Button>
          </div>
        </form>
      )}
    </Card>
  );
}