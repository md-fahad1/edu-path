'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { bn, cn } from '@/lib/utils';
import { Card, Progress } from './ui';

type GameData = {
  xp: number; level: number; from: number; to: number; pct: number;
  badges: { code: string; name: string; icon: string; desc: string; earnedAt: string | null }[];
};

export function GamePanel() {
  const { data } = useQuery({ queryKey: ['game'], queryFn: () => api<GameData>('/analytics/game') });
  if (!data) return null;
  const got = data.badges.filter((b) => b.earnedAt).length;
  const next = data.badges.find((b) => !b.earnedAt);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">⭐ লেভেল {bn(data.level)}</h2>
        <span className="text-sm text-slate-500">{bn(data.xp)} XP</span>
      </div>
      <div className="mt-2"><Progress value={data.pct} /></div>
      <p className="mt-1 text-xs text-slate-500">পরের লেভেলে যেতে আরও {bn(data.to - data.xp)} XP দরকার</p>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">🏅 ব্যাজ ({bn(got)}/{bn(data.badges.length)})</h3>
        <Link href="/leaderboard" className="text-xs text-brand-700 hover:underline">🏆 লিডারবোর্ড →</Link>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {data.badges.map((b) => (
          <li
            key={b.code}
            title={`${b.name} — ${b.desc}`}
            className={cn('flex flex-col items-center rounded-lg border p-2 text-center', b.earnedAt ? 'border-amber-200 bg-amber-50' : 'border-slate-200 opacity-40 grayscale')}
          >
            <span className="text-2xl" aria-hidden>{b.icon}</span>
            <span className="mt-1 text-[11px] leading-tight">{b.name}</span>
            <span className="sr-only">{b.earnedAt ? 'অর্জিত' : 'লক করা'}: {b.desc}</span>
          </li>
        ))}
      </ul>
      {next && <p className="mt-3 text-xs text-slate-500">🎯 পরের লক্ষ্য: <b>{next.name}</b> — {next.desc}</p>}
    </Card>
  );
}