import type { MetadataRoute } from 'next';
import { sapi } from '@/lib/api';
import { SITE } from '@/lib/utils';

export const revalidate = 3600;
type D = { categories: string[]; subjects: string[]; chapters: string[]; exams: string[]; tests: string[]; questions: { slug: string; updatedAt: string }[]; questionPages: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await sapi<D>('/sitemap/data', 3600).catch(() => null);
  const now = new Date();
  const fixed = ['', '/model-test', '/practice', '/pricing', '/about', '/contact', '/privacy', '/terms', '/refund'].map((p) => ({ url: SITE + p, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.5, lastModified: now }));
  if (!d) return fixed;
  // Boro scale-e (50,000+) generateSitemaps() diye bhag korun
  return [
    ...fixed,
    ...d.categories.map((s) => ({ url: `${SITE}/${s}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...d.subjects.map((s) => ({ url: `${SITE}/${s}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...d.chapters.map((s) => ({ url: `${SITE}/${s}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...d.exams.map((s) => ({ url: `${SITE}/exam/${s}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...d.tests.map((s) => ({ url: `${SITE}/model-test/${s}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...d.questions.map((q) => ({ url: `${SITE}/mcq/${q.slug}`, lastModified: q.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
