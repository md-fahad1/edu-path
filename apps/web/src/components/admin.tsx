'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TreeNode = { id: string; name: string; slug: string; subjects: { id: string; name: string; chapters: { id: string; name: string; slug: string; topics: { id: string; name: string }[] }[] }[] }[];
export function useTree() {
  const q = useQuery({ queryKey: ['tree'], queryFn: () => api<TreeNode>('/catalog/tree'), staleTime: 60_000 });
  const chapters = (q.data ?? []).flatMap((c) => c.subjects.flatMap((s) => s.chapters.map((ch) => ({ ...ch, subjectId: s.id, label: `${c.name} › ${s.name} › ${ch.name}` }))));
  const subjects = (q.data ?? []).flatMap((c) => c.subjects.map((s) => ({ id: s.id, name: `${c.name} › ${s.name}` })));
  return { ...q, chapters, subjects };
}

export const STATUS_BN: Record<string, string> = { DRAFT: 'ড্রাফট', REVIEWED: 'রিভিউড', PUBLISHED: 'পাবলিশড', ARCHIVED: 'আর্কাইভ' };
export const STATUS_TONE: Record<string, 'slate' | 'amber' | 'green' | 'red'> = { DRAFT: 'slate', REVIEWED: 'amber', PUBLISHED: 'green', ARCHIVED: 'red' };
