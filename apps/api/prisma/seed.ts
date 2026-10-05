import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import { categories, chapters, questions as baseQuestions } from './seed-data';
import { extraQuestions } from './seed-data-extra';

// Notun MCQ seed-data-extra.ts-e; base-er pore jog hoy tai age-r question slug (…-q1, -q2) bodlay na
const questions = [...baseQuestions, ...extraQuestions];

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const L = ['A', 'B', 'C', 'D'];

async function main() {
  // ---- users
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@edu.local';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { name: 'Admin', email: adminEmail, passwordHash: await bcrypt.hash(adminPass, 11), role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'teacher@edu.local' }, update: {},
    create: { name: 'Teacher Demo', email: 'teacher@edu.local', passwordHash: await bcrypt.hash('Teacher@12345', 11), role: 'TEACHER' },
  });
  await prisma.user.upsert({
    where: { email: 'student@edu.local' }, update: {},
    create: { name: 'Student Demo', email: 'student@edu.local', passwordHash: await bcrypt.hash('Student@12345', 11), role: 'STUDENT' },
  });

  // ---- plans
  if ((await prisma.plan.count()) === 0) {
    await prisma.plan.createMany({
      data: [
        { name: 'Monthly', priceBdt: 99, durationDays: 30, features: ['সব Premium মডেল টেস্ট', 'সম্পূর্ণ Weak-topic বিশ্লেষণ', 'বিজ্ঞাপনমুক্ত'] },
        { name: 'Quarterly', priceBdt: 249, durationDays: 90, features: ['সব Premium মডেল টেস্ট', 'সম্পূর্ণ Weak-topic বিশ্লেষণ', 'বিজ্ঞাপনমুক্ত', '৩ মাসে ১৫% সাশ্রয়'] },
        { name: 'Exam Pack (HSC/BCS)', priceBdt: 399, durationDays: 180, features: ['সব Premium মডেল টেস্ট', 'সম্পূর্ণ Weak-topic বিশ্লেষণ', 'বিজ্ঞাপনমুক্ত', '৬ মাসের এক্সাম প্যাক'] },
      ],
    });
  }

  // ---- categories
  const catId = new Map<string, string>();
  let order = 0;
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, description: c.description }, create: { ...c, order: order++ } });
    catId.set(c.slug, row.id);
  }

  // ---- subject > chapter > topic
  const chapterId = new Map<string, string>();
  const topicId = new Map<string, string>();
  const chapterCat = new Map<string, string>();
  const subOrder = new Map<string, number>();
  let chOrder = 0;
  for (const [cat, sSlug, sName, chSlug, chName, summary, topics] of chapters) {
    const categoryId = catId.get(cat)!;
    const subject = await prisma.subject.upsert({
      where: { categoryId_slug: { categoryId, slug: sSlug } }, update: { name: sName },
      create: { categoryId, slug: sSlug, name: sName, order: subOrder.set(cat + sSlug, subOrder.size).size },
    });
    const ch = await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: subject.id, slug: chSlug } }, update: { name: chName, summary },
      create: { subjectId: subject.id, slug: chSlug, name: chName, summary, order: chOrder++ },
    });
    chapterId.set(chSlug, ch.id);
    chapterCat.set(chSlug, cat);
    let to = 0;
    for (const [tSlug, tName] of topics) {
      const t = await prisma.topic.upsert({
        where: { chapterId_slug: { chapterId: ch.id, slug: tSlug } }, update: { name: tName },
        create: { chapterId: ch.id, slug: tSlug, name: tName, order: to++ },
      });
      topicId.set(tSlug, t.id);
    }
  }

  // ---- exams (sample sets)
  const bcsExam = await prisma.exam.upsert({
    where: { slug: 'bcs-preli-sample-set-1' }, update: {},
    create: { categoryId: catId.get('bcs')!, name: 'বিসিএস প্রিলি – নমুনা সেট ১', slug: 'bcs-preli-sample-set-1', year: 2026, conductor: 'নমুনা (Sample)', answerKeyOfficial: false },
  });
  const admExam = await prisma.exam.upsert({
    where: { slug: 'admission-sample-set-1' }, update: {},
    create: { categoryId: catId.get('admission')!, name: 'ভর্তি পরীক্ষা – নমুনা সেট ১', slug: 'admission-sample-set-1', year: 2026, conductor: 'নমুনা (Sample)', answerKeyOfficial: false },
  });

  // ---- questions
  const counters = new Map<string, number>();
  const byChapter = new Map<string, string[]>();
  for (const [chSlug, tSlug, text, opts, correct, explanation, difficulty] of questions) {
    const n = (counters.get(chSlug) ?? 0) + 1;
    counters.set(chSlug, n);
    const slug = `${chSlug}-q${n}`;
    const cat = chapterCat.get(chSlug)!;
    // Exam page-e shob na dhukiye shudhu protita chapter-er prothom 8 ta (nomuna set)
    const examId = n <= 8 ? (cat === 'bcs' ? bcsExam.id : cat === 'admission' ? admExam.id : null) : null;
    const q = await prisma.question.upsert({
      where: { slug },
      update: {},
      create: {
        slug, text, explanation, difficulty: difficulty ?? 'MEDIUM', status: 'PUBLISHED', source: 'নমুনা প্রশ্ন (মৌলিক)',
        aiGenerated: true, answerVerified: false, chapterId: chapterId.get(chSlug)!, topicId: topicId.get(tSlug)!, examId, createdById: admin.id,
        options: { create: opts.map((t, i) => ({ label: L[i], text: t, isCorrect: i === correct })) },
      },
    });
    byChapter.set(chSlug, [...(byChapter.get(chSlug) ?? []), q.id]);
  }

  // ---- tests (chapter-wise + 1 premium mock)
  const mk = async (slug: string, title: string, qids: string[], extra: Record<string, unknown>) => {
    if (await prisma.modelTest.findUnique({ where: { slug } })) return;
    await prisma.modelTest.create({
      data: {
        slug, title, durationMin: Math.max(5, qids.length), isPublished: true, ...extra,
        questions: { create: qids.map((questionId, order) => ({ questionId, order })) },
      } as any,
    });
  };
  // Chapter-e 300 ta MCQ thakle ekta test-e shob na diye 20 ta kore set (max 6 set); protita set-e chapter-er shob topic theke mix
  const SET = 20, MAX_SETS = 6;
  for (const [chSlug, ids] of byChapter) {
    const ch = chapters.find((c) => c[3] === chSlug)!;
    const bcs = ch[0] === 'bcs';
    const title = ch[4].replace(/^অধ্যায় \d+: /, '');
    const sets = Math.min(MAX_SETS, Math.max(1, Math.ceil(ids.length / SET)));
    for (let i = 0; i < sets; i++) {
      const part = (sets === 1 ? ids : ids.filter((_, idx) => idx % sets === i)).slice(0, SET);
      if (part.length < 5) continue;
      await mk(i === 0 ? `${chSlug}-model-test` : `${chSlug}-model-test-${i + 1}`, `${title} – মডেল টেস্ট ${i + 1}`, part, { type: 'CHAPTER', chapterId: chapterId.get(chSlug), negativeMark: bcs ? 0.5 : 0.25 });
    }
  }
  const pick = (cat: string, per: number) => [...byChapter].filter(([s]) => chapterCat.get(s) === cat).flatMap(([, ids]) => ids.slice(0, per));
  const bcsMock = pick('bcs', 8);
  await mk('bcs-preli-full-mock-1', 'বিসিএস প্রিলি – ফুল মক টেস্ট ১ (Premium)', bcsMock, { type: 'MOCK', examId: bcsExam.id, isPremium: true, negativeMark: 0.5, durationMin: Math.ceil(bcsMock.length * 0.6) });
  const admMock = pick('admission', 8);
  await mk('admission-mock-1', 'ভর্তি পরীক্ষা – মক টেস্ট ১', admMock, { type: 'EXAM_PAPER', examId: admExam.id, negativeMark: 0.25, durationMin: Math.ceil(admMock.length * 0.6) });

  const perChapter = [...byChapter].map(([s, ids]) => `${s}: ${ids.length}`).join(' | ');
  console.log('Per-chapter MCQ count ->', perChapter);
  console.log(`Seed done: ${questions.length} questions, ${chapters.length} chapters.`);
  console.log(`Admin login: ${adminEmail} / ${adminPass}   |   Student: student@edu.local / Student@12345`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());