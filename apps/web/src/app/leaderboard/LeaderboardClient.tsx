'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn, cn } from '@/lib/utils';
import { Card, Empty, ErrorBox, LinkButton, Loading, PageTitle } from '@/components/ui';

type Data = {
  since: string;
  rows: { rank: number; name: string; xp: number; isMe: boolean }[];
  me: { xp: number; rank: number | null } | null;
};

export function LeaderboardClient() {
  const { user } = useAuth();
  const { data, error } = useQuery({ queryKey: ['weekly', user?.id ?? 'guest'], queryFn: () => api<Data>('/leaderboard/weekly') });
  if (error) return <ErrorBox message={(error as Error).message} />;
  if (!data) return <Loading />;
  const inTop = data.rows.some((r) => r.isMe);

  return (
    <>
      <PageTitle title="🏆 সাপ্তাহিক লিডারবোর্ড" sub="শনিবার থেকে শুক্রবার — প্রশ্ন সমাধান ও চ্যালেঞ্জ করে XP জমান" right={user ? <LinkButton href="/challenge" size="sm">🎯 আজকের চ্যালেঞ্জ</LinkButton> : undefined} />

      {data.me && !inTop && (
        <Card className="mb-4 text-center">
          {data.me.rank
            ? <>আপনি এখন <b>#{bn(data.me.rank)}</b> · এই সপ্তাহে <b>{bn(data.me.xp)} XP</b></>
            : <>এই সপ্তাহে এখনো কোনো XP নেই — একটা প্রশ্ন সমাধান করে শুরু করুন!</>}
        </Card>
      )}

      {!data.rows.length ? (
        <Empty title="এই সপ্তাহে এখনো কেউ XP অর্জন করেনি" hint="প্রথম হয়ে যান!" action={<LinkButton href="/practice?mode=smart">প্র্যাকটিস শুরু করুন</LinkButton>} />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="px-4 py-2.5">#</th><th>নাম</th><th className="pr-4 text-right">XP</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.rank} className={cn('border-t border-slate-100', r.isMe && 'bg-amber-50 font-semibold')}>
                  <td className="px-4 py-2.5 font-semibold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : bn(r.rank)}</td>
                  <td>{r.name}{r.isMe && <span className="ml-2 text-xs text-brand-700">(আপনি)</span>}</td>
                  <td className="pr-4 text-right">{bn(r.xp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {!user && <p className="mt-4 text-center text-sm text-slate-500">নিজের নাম লিডারবোর্ডে দেখতে লগইন করুন।</p>}
    </>
  );
}