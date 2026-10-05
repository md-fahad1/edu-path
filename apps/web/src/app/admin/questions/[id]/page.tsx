'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorBox, Loading, PageTitle } from '@/components/ui';
import { QuestionEditor } from '@/components/QuestionEditor';

export default function EditQuestion() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useQuery({ queryKey: ['aq-one', id], queryFn: () => api<any>(`/admin/questions/${id}`), staleTime: 0, gcTime: 0 });
  if (error) return <ErrorBox message={(error as Error).message} />;
  if (!data) return <Loading />;
  return (
    <>
      <PageTitle title="প্রশ্ন সম্পাদনা" sub={data.creator?.name ? `লেখক: ${data.creator.name}` : undefined} />
      <QuestionEditor key={data.id + data.updatedAt} initial={{
        id: data.id, text: data.text, explanation: data.explanation ?? '', difficulty: data.difficulty, chapterId: data.chapterId, topicId: data.topicId ?? '',
        year: data.year ? String(data.year) : '', source: data.source ?? '', status: data.status,
        options: [0, 1, 2, 3].map((i) => data.options[i] ? { text: data.options[i].text, isCorrect: data.options[i].isCorrect } : { text: '', isCorrect: false }),
      }} />
    </>
  );
}
