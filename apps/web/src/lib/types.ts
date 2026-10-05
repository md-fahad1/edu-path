export type Option = { id: string; label: string; text: string; isCorrect: boolean };
export type Question = {
  id: string; slug: string; text: string; explanation?: string | null; difficulty?: string; year?: number | null; source?: string | null;
  topic?: { id: string; name: string } | null; options: Option[];
};
export type Paged<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };
export type TestLite = { id: string; title: string; slug: string; durationMin: number; isPremium: boolean; negativeMark?: number; _count?: { questions: number } };
