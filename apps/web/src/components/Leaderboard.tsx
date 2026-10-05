import { sapi } from '@/lib/api';
import { bn, fmtTime } from '@/lib/utils';
import { Card } from './ui';

export async function Leaderboard({ testId }: { testId: string }) {
  const rows = await sapi<{ rank: number; name: string; score: number; correct: number; seconds: number }[]>(`/tests/${testId}/leaderboard`, 300).catch(() => []);
  if (!rows.length) return <Card className="text-center text-slate-500">এখনো কেউ পরীক্ষা দেয়নি – প্রথম হয়ে যান!</Card>;
  return (
    <Card className="overflow-x-auto !p-0">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="px-4 py-2.5">#</th><th>নাম</th><th>স্কোর</th><th className="hidden sm:table-cell">সময়</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.rank} className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : bn(r.rank)}</td><td>{r.name}</td><td className="font-semibold">{bn(r.score)}</td><td className="hidden text-slate-500 sm:table-cell">{fmtTime(r.seconds)}</td></tr>)}</tbody>
      </table>
    </Card>
  );
}
