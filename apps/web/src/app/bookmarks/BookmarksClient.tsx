'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/components/useRequireAuth';
import type { Question } from '@/lib/types';
import { QuestionCard } from '@/components/QuestionCard';
import { Empty, LinkButton, Loading, PageTitle } from '@/components/ui';

export function BookmarksClient() {
  const { allowed } = useRequireAuth();
  const { data, isLoading } = useQuery({ queryKey: ['bookmarks'], queryFn: () => api<Question[]>('/bookmarks'), enabled: allowed });
  if (!allowed || isLoading) return <Loading />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="★ আমার বুকমার্ক" sub="যে প্রশ্নগুলো পরে আবার দেখতে চান" />
      {data?.length ? <div className="space-y-4">{data.map((q) => <QuestionCard key={q.id} q={q} />)}</div> : <Empty title="কোনো বুকমার্ক নেই" hint="যেকোনো প্রশ্নের নিচে “☆ বুকমার্ক” চাপুন।" action={<LinkButton href="/practice">প্র্যাকটিস শুরু করুন</LinkButton>} />}
    </div>
  );
}
