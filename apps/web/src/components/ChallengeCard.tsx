'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { bn } from '@/lib/utils';
import { Card, LinkButton } from './ui';

type Status = { total: number; answered: number; correct: number; done: boolean };

export function ChallengeCard() {
  const { data } = useQuery({ queryKey: ['challenge-status'], queryFn: () => api<Status>('/challenge/status') });
  if (!data || !data.total) return null;

  if (data.done) {
    return (
      <Card className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">✅ আজকের চ্যালেঞ্জ শেষ</p>
          <p className="text-sm text-slate-500">স্কোর {bn(data.correct)}/{bn(data.total)} · কাল আবার নতুন ১০টি প্রশ্ন আসবে</p>
        </div>
        <LinkButton href="/leaderboard" variant="outline" size="sm">🏆 লিডারবোর্ড</LinkButton>
      </Card>
    );
  }
  return (
    <Card className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">🎯 আজকের চ্যালেঞ্জ</p>
        <p className="text-sm text-slate-500">
          {data.answered ? `${bn(data.answered)}/${bn(data.total)} শেষ — বাকিটুকু শেষ করুন` : `${bn(data.total)}টি প্রশ্ন · বোনাস XP ও streak পুরস্কার`}
        </p>
      </div>
      <LinkButton href="/challenge" size="sm">{data.answered ? 'চালিয়ে যান' : 'শুরু করুন'}</LinkButton>
    </Card>
  );
}