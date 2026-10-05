'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn } from '@/lib/utils';
import { Badge, Button, Card, ErrorBox, Input, Loading, PageTitle, Select } from '@/components/ui';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [err, setErr] = useState('');
  const me = useAuth((s) => s.user?.id);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['users', search], queryFn: () => api<{ items: any[]; total: number }>(`/admin/users?search=${encodeURIComponent(search)}`) });
  const upd = useMutation({ mutationFn: (v: { id: string; d: object }) => api(`/admin/users/${v.id}`, { method: 'PATCH', json: v.d }), onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['users'] }); }, onError: (e: Error) => setErr(e.message) });
  return (
    <>
      <PageTitle title="ইউজার" sub={`মোট ${bn(data?.total ?? 0)} জন`} />
      <div className="mb-4 max-w-sm"><Input placeholder="নাম / ইমেইল / ফোন খুঁজুন" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="ইউজার খুঁজুন" /></div>
      {err && <div className="mb-3"><ErrorBox message={err} /></div>}
      {isLoading ? <Loading /> : <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[36rem] text-left text-[15px]"><thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="px-4 py-2.5">নাম</th><th>যোগাযোগ</th><th>রোল</th><th>অবস্থা</th></tr></thead>
        <tbody>{data?.items.map((u) => <tr key={u.id} className="border-t border-slate-100"><td className="px-4 py-3">{u.name}</td><td className="text-sm text-slate-600">{u.email ?? u.phone}</td>
          <td><Select aria-label="রোল" value={u.role} disabled={u.id === me} onChange={(e) => upd.mutate({ id: u.id, d: { role: e.target.value } })} className="!w-32 !py-1.5"><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></Select></td>
          <td>{u.isActive ? <Badge tone="green">সক্রিয়</Badge> : <Badge tone="red">ব্যান</Badge>} {u.id !== me && <Button size="sm" variant="ghost" onClick={() => upd.mutate({ id: u.id, d: { isActive: !u.isActive } })}>{u.isActive ? 'ব্যান' : 'আনব্যান'}</Button>}</td></tr>)}</tbody></table></Card>}
    </>
  );
}
