import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../common/common.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuthUser } from '../common/roles';
import { slugify, slugifyName } from '../common/utils';
import { parseCsv } from './csv';
import { QuestionInput, TestInput, UpdateQuestionInput, UpdateTestInput } from './admin.dto';

type Status = 'DRAFT' | 'REVIEWED' | 'PUBLISHED' | 'ARCHIVED';
const LABELS = ['A', 'B', 'C', 'D'];

const ENTITIES = {
  categories: { model: 'category', fields: { name: 's', slug: 's', description: 's?', order: 'n', isActive: 'b', categoryId: '' } },
  subjects: { model: 'subject', fields: { categoryId: 's', name: 's', slug: 's', order: 'n', isActive: 'b' } },
  chapters: { model: 'chapter', fields: { subjectId: 's', name: 's', slug: 's', summary: 's?', order: 'n', isPremium: 'b', isActive: 'b' } },
  topics: { model: 'topic', fields: { chapterId: 's', name: 's', slug: 's', order: 'n' } },
  exams: { model: 'exam', fields: { categoryId: 's', name: 's', slug: 's', year: 'n', conductor: 's?', answerKeyOfficial: 'b' } },
} as const;
type EntityKey = keyof typeof ENTITIES;

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private reval: RevalidateService, private subs: SubscriptionsService) {}

  // ---------- dashboard ----------
  async stats() {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const [byStatus, openReports, signupsToday, users, pendingPayments, attemptsToday, tests] = await Promise.all([
      this.prisma.question.groupBy({ by: ['status'], _count: true }),
      this.prisma.questionReport.count({ where: { status: 'OPEN' } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count(),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.testAttempt.count({ where: { startedAt: { gte: today } } }),
      this.prisma.modelTest.count(),
    ]);
    const q = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Record<string, number>;
    return { questions: { DRAFT: q.DRAFT ?? 0, REVIEWED: q.REVIEWED ?? 0, PUBLISHED: q.PUBLISHED ?? 0, ARCHIVED: q.ARCHIVED ?? 0 }, openReports, signupsToday, users, pendingPayments, attemptsToday, tests };
  }

  // ---------- questions ----------
  async listQuestions(f: { search?: string; status?: string; chapterId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(f.page) || 1);
    const limit = Math.min(Number(f.limit) || 20, 100);
    const where = {
      ...(f.status && { status: f.status as Status }),
      ...(f.chapterId && { chapterId: f.chapterId }),
      ...(f.search && { text: { contains: f.search, mode: 'insensitive' as const } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, slug: true, text: true, status: true, difficulty: true, answerVerified: true, source: true, year: true, updatedAt: true, chapter: { select: { name: true, subject: { select: { name: true } } } }, _count: { select: { reports: { where: { status: 'OPEN' } } } } },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getQuestion(id: string) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { label: 'asc' } }, chapter: { select: { id: true, name: true, subjectId: true } }, creator: { select: { name: true } } },
    });
    if (!q) throw new NotFoundException();
    return q;
  }

  private checkOptions(options: { text: string; isCorrect: boolean }[]) {
    const correct = options.filter((o) => o.isCorrect).length;
    if (correct !== 1) throw new BadRequestException('Thik 1 ta correct option dite hobe');
  }

  async createQuestion(dto: QuestionInput, actor: AuthUser) {
    this.checkOptions(dto.options);
    const chapter = await this.prisma.chapter.findUnique({ where: { id: dto.chapterId }, select: { slug: true } });
    if (!chapter) throw new BadRequestException('Chapter paoa jay nai');
    return this.prisma.question.create({
      data: {
        slug: slugify(dto.text, chapter.slug.replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'mcq'),
        text: dto.text.trim(), explanation: dto.explanation?.trim() || null, difficulty: dto.difficulty ?? 'MEDIUM',
        chapterId: dto.chapterId, topicId: dto.topicId || null, examId: dto.examId || null, year: dto.year ?? null, source: dto.source || null,
        status: 'DRAFT', createdById: actor.id,
        options: { create: dto.options.map((o, i) => ({ label: LABELS[i], text: o.text.trim(), isCorrect: o.isCorrect })) },
      },
      include: { options: true },
    });
  }

  async updateQuestion(id: string, dto: UpdateQuestionInput, actor: AuthUser) {
    const q = await this.prisma.question.findUnique({ where: { id }, select: { id: true, slug: true, status: true } });
    if (!q) throw new NotFoundException();
    if (dto.options) this.checkOptions(dto.options);
    // Teacher published/reviewed content edit korle abar DRAFT, jeno review chhara live-e na thake
    const demote = actor.role !== 'ADMIN' && (q.status === 'PUBLISHED' || q.status === 'REVIEWED');
    const { options, ...rest } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          ...rest,
          ...(rest.text && { text: rest.text.trim() }),
          ...(rest.topicId !== undefined && { topicId: rest.topicId || null }),
          ...(rest.examId !== undefined && { examId: rest.examId || null }),
          ...(demote && { status: 'DRAFT' as const }),
        },
      });
      if (options) {
        // attempt history bhangbe na bole option gulo in-place update (delete na)
        for (let i = 0; i < options.length; i++) {
          await tx.option.upsert({
            where: { questionId_label: { questionId: id, label: LABELS[i] } },
            create: { questionId: id, label: LABELS[i], text: options[i].text.trim(), isCorrect: options[i].isCorrect },
            update: { text: options[i].text.trim(), isCorrect: options[i].isCorrect },
          });
        }
        await tx.option.deleteMany({ where: { questionId: id, label: { notIn: LABELS.slice(0, options.length) }, answers: { none: {} } } });
      }
    });
    this.reval.paths([`/mcq/${q.slug}`]);
    return this.getQuestion(id);
  }

  private async applyStatus(id: string, status: Status, actor: AuthUser) {
    if (status === 'PUBLISHED' && actor.role !== 'ADMIN') throw new ForbiddenException('Shudhu Admin publish korte pare');
    const q = await this.prisma.question.findUnique({ where: { id }, include: { options: true } });
    if (!q) throw new NotFoundException();
    if (status === 'REVIEWED' && actor.role !== 'ADMIN' && q.createdById === actor.id)
      throw new ForbiddenException('Nijer likha question nije review kora jabe na');
    if (status === 'REVIEWED' || status === 'PUBLISHED') {
      if (q.options.length !== 4 || q.options.filter((o) => o.isCorrect).length !== 1)
        throw new BadRequestException('Exactly 4 option ar 1 ta correct answer lagbe');
    }
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status, reviewedById: status === 'DRAFT' ? null : actor.id, reviewedAt: status === 'DRAFT' ? null : new Date() },
    });
    this.reval.paths([`/mcq/${q.slug}`]);
    return updated;
  }

  setStatus(id: string, status: Status, actor: AuthUser) {
    return this.applyStatus(id, status, actor);
  }

  async bulkStatus(ids: string[], status: Status, actor: AuthUser) {
    let ok = 0;
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      try { await this.applyStatus(id, status, actor); ok++; } catch (e: any) { failed.push({ id, reason: e?.message ?? 'error' }); }
    }
    return { ok, failed };
  }

  async reviewQueue(f: { lowConfidence?: boolean; subjectId?: string; page?: number }) {
    const take = 20;
    const page = Math.max(1, Number(f.page) || 1);
    const where = {
      status: 'DRAFT' as const,
      ...(f.lowConfidence && { answerVerified: false }),
      ...(f.subjectId && { chapter: { subjectId: f.subjectId } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where, orderBy: [{ answerVerified: 'asc' }, { createdAt: 'asc' }], skip: (page - 1) * take, take,
        include: { options: { orderBy: { label: 'asc' } }, chapter: { select: { name: true, subject: { select: { name: true } } } }, creator: { select: { name: true } } },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total, page, take };
  }

  // ---------- CSV import ----------
  private async parseImport(csv: string, defaultChapterId?: string) {
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new BadRequestException('CSV-te header + kompokkhe 1 ti row lagbe');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (n: string) => header.indexOf(n);
    for (const need of ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct'])
      if (idx(need) < 0) throw new BadRequestException(`CSV header-e "${need}" column nei`);

    const chapters = await this.prisma.chapter.findMany({ select: { id: true, slug: true, topics: { select: { id: true, slug: true, name: true } } } });
    const bySlug = new Map(chapters.map((c) => [c.slug, c]));
    const seen = new Set<string>();
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (n: string) => (idx(n) >= 0 ? (row[idx(n)] ?? '').trim() : '');
      const errors: string[] = [];
      const chapterSlug = get('chapter_slug');
      const chapter = chapterSlug ? bySlug.get(chapterSlug) : chapters.find((c) => c.id === defaultChapterId);
      if (!chapter) errors.push(chapterSlug ? `chapter_slug "${chapterSlug}" paoa jay nai` : 'chapter_slug nei (default chapter select korun)');
      const text = get('question');
      if (text.length < 3) errors.push('question khali');
      const options = ['a', 'b', 'c', 'd'].map((l, i) => ({ label: LABELS[i], text: get(`option_${l}`), isCorrect: get('correct').toUpperCase() === l.toUpperCase() }));
      if (options.some((o) => !o.text)) errors.push('4 ti option-i lagbe');
      if (options.filter((o) => o.isCorrect).length !== 1) errors.push('correct column A/B/C/D hote hobe');
      const topicKey = get('topic_slug') || get('topic'); // slug ba nam, duto-i cholbe
      const topic = chapter && topicKey ? chapter.topics.find((t) => t.slug === topicKey || t.name.trim() === topicKey) : undefined;
      if (topicKey && chapter && !topic) errors.push(`topic "${topicKey}" paoa jay nai`);
      const diff = (get('difficulty') || 'MEDIUM').toUpperCase();
      if (!['EASY', 'MEDIUM', 'HARD'].includes(diff)) errors.push('difficulty EASY/MEDIUM/HARD hobe');
      const year = get('year') ? Number(get('year')) : null;
      if (year !== null && !(year >= 1900 && year <= 2100)) errors.push('year thik na');
      const norm = text.replace(/\s+/g, ' ').toLowerCase();
      if (norm && seen.has(norm)) errors.push('file-e duplicate question');
      seen.add(norm);
      if (!errors.length && chapter && (await this.prisma.question.findFirst({ where: { chapterId: chapter.id, text }, select: { id: true } })))
        errors.push('ei chapter-e question age theke ache');
      out.push({
        line: r + 1, errors, text, options, chapterId: chapter?.id ?? null, topicId: topic?.id ?? null,
        explanation: get('explanation') || null, year, source: get('source') || null, difficulty: diff as 'EASY' | 'MEDIUM' | 'HARD',
      });
    }
    return out;
  }

  async importPreview(csv: string, defaultChapterId?: string) {
    const rows = await this.parseImport(csv, defaultChapterId);
    return { total: rows.length, valid: rows.filter((r) => !r.errors.length).length, rows: rows.slice(0, 300) };
  }

  async importCommit(csv: string, defaultChapterId: string | undefined, actor: AuthUser) {
    const rows = await this.parseImport(csv, defaultChapterId);
    const good = rows.filter((r) => !r.errors.length);
    for (const r of good) {
      await this.prisma.question.create({
        data: {
          slug: slugify(r.text), text: r.text, explanation: r.explanation, difficulty: r.difficulty, year: r.year, source: r.source,
          chapterId: r.chapterId!, topicId: r.topicId, status: 'DRAFT', createdById: actor.id, // kokhono sorasori PUBLISHED na
          options: { create: r.options },
        },
      });
    }
    const failed = rows.length - good.length;
    await this.prisma.importJob.create({
      data: {
        createdById: actor.id, fileUrl: 'inline-csv', fileType: 'CSV', status: failed && !good.length ? 'FAILED' : 'COMPLETED',
        totalRows: rows.length, successRows: good.length, failedRows: failed,
        errorLog: rows.filter((r) => r.errors.length).slice(0, 100).map((r) => ({ line: r.line, errors: r.errors })),
      },
    });
    return { imported: good.length, failed };
  }

  importJobs() {
    return this.prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { createdBy: { select: { name: true } } } });
  }

  // ---------- reports ----------
  reports(status = 'OPEN') {
    return this.prisma.questionReport.findMany({
      where: { status: status as any }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { question: { select: { id: true, slug: true, text: true, status: true, options: { orderBy: { label: 'asc' }, select: { label: true, text: true, isCorrect: true } } } }, user: { select: { name: true } } },
    });
  }
  updateReport(id: string, status: 'OPEN' | 'RESOLVED' | 'REJECTED') {
    return this.prisma.questionReport.update({ where: { id }, data: { status } });
  }

  // ---------- catalog (generic CRUD) ----------
  private entity(name: string) {
    const e = ENTITIES[name as EntityKey];
    if (!e) throw new NotFoundException('Unknown entity');
    return { ...e, delegate: (this.prisma as any)[e.model] };
  }
  private pick(name: string, body: Record<string, any>, creating: boolean) {
    const { fields } = this.entity(name);
    const data: Record<string, any> = {};
    for (const [k, t] of Object.entries(fields)) {
      if (!(k in body) || t === '') continue;
      const v = body[k];
      if (t === 'n') data[k] = Number(v);
      else if (t === 'b') data[k] = !!v;
      else if (t === 's?') data[k] = v === '' || v == null ? null : String(v);
      else data[k] = String(v).trim();
    }
    if (creating && !data.slug && data.name) data.slug = slugifyName(data.name);
    return data;
  }
  async catalogList(name: string, parentId?: string) {
    const e = this.entity(name);
    const parentKey = { subjects: 'categoryId', chapters: 'subjectId', topics: 'chapterId', exams: 'categoryId', categories: '' }[name as EntityKey];
    return e.delegate.findMany({ where: parentId && parentKey ? { [parentKey]: parentId } : {}, orderBy: name === 'exams' ? [{ year: 'desc' }, { name: 'asc' }] : [{ order: 'asc' }, { name: 'asc' }] });
  }
  async catalogCreate(name: string, body: Record<string, any>) {
    const r = await this.entity(name).delegate.create({ data: this.pick(name, body, true) });
    this.reval.paths(['/']);
    return r;
  }
  async catalogUpdate(name: string, id: string, body: Record<string, any>) {
    const r = await this.entity(name).delegate.update({ where: { id }, data: this.pick(name, body, false) });
    this.reval.paths(['/']);
    return r;
  }
  async catalogDelete(name: string, id: string) {
    try {
      await this.entity(name).delegate.delete({ where: { id } });
    } catch {
      throw new BadRequestException('Delete kora jay nai (nicher data ba question ache). Boro-r poriborte inactive korun.');
    }
    this.reval.paths(['/']);
    return { ok: true };
  }

  // ---------- tests ----------
  tests() {
    return this.prisma.modelTest.findMany({
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { chapter: { select: { name: true } }, exam: { select: { name: true } }, _count: { select: { questions: true, attempts: true } } },
    });
  }
  async createTest(dto: TestInput, actor: AuthUser) {
    let ids = dto.questionIds ?? [];
    if (!ids.length) {
      if (!dto.chapterId && !dto.examId) throw new BadRequestException('Chapter, exam ba questionIds dite hobe');
      const pool = await this.prisma.question.findMany({
        where: { status: 'PUBLISHED', ...(dto.chapterId && { chapterId: dto.chapterId }), ...(dto.examId && { examId: dto.examId }) },
        select: { id: true }, orderBy: { createdAt: 'asc' },
      });
      ids = pool.map((p) => p.id);
      if (dto.count && dto.count < ids.length) ids = ids.sort(() => Math.random() - 0.5).slice(0, dto.count);
    }
    if (!ids.length) throw new BadRequestException('Published question paoa jay nai');
    const base = slugifyName(dto.title);
    return this.prisma.modelTest.create({
      data: {
        title: dto.title, slug: `${base}-${Math.random().toString(36).slice(2, 7)}`, type: dto.type ?? (dto.examId ? 'EXAM_PAPER' : 'CHAPTER'),
        durationMin: dto.durationMin, negativeMark: dto.negativeMark, markPerQ: dto.markPerQ ?? 1,
        isPremium: !!dto.isPremium, isPublished: actor.role === 'ADMIN' ? !!dto.isPublished : false, // teacher shudhu draft
        chapterId: dto.chapterId || null, examId: dto.examId || null,
        questions: { create: ids.map((questionId, order) => ({ questionId, order })) },
      },
    });
  }
  updateTest(id: string, dto: UpdateTestInput, actor: AuthUser) {
    if (dto.isPublished !== undefined && actor.role !== 'ADMIN') throw new ForbiddenException('Shudhu Admin publish korte pare');
    return this.prisma.modelTest.update({ where: { id }, data: dto });
  }

  // ---------- users / plans / payments ----------
  async users(search?: string, page = 1) {
    const where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }] } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (Math.max(1, page) - 1) * 30, take: 30, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }
  async updateUser(id: string, dto: { role?: any; isActive?: boolean }, actor: AuthUser) {
    if (id === actor.id) throw new BadRequestException('Nijer role/status bodlano jabe na');
    return this.prisma.user.update({ where: { id }, data: dto, select: { id: true, name: true, role: true, isActive: true } });
  }
  plans() { return this.prisma.plan.findMany({ orderBy: { priceBdt: 'asc' } }); }
  createPlan(d: { name: string; priceBdt: number; durationDays: number; isActive?: boolean }) { return this.prisma.plan.create({ data: d }); }
  updatePlan(id: string, d: { name: string; priceBdt: number; durationDays: number; isActive?: boolean }) { return this.prisma.plan.update({ where: { id }, data: d }); }
  payments(status?: string) {
    return this.prisma.payment.findMany({
      where: status ? { status: status as any } : {}, orderBy: { createdAt: 'desc' }, take: 100,
      include: { user: { select: { name: true, email: true, phone: true } }, plan: { select: { name: true } } },
    });
  }
  approvePayment(id: string) { return this.subs.activate(id); }
  rejectPayment(id: string) { return this.prisma.payment.update({ where: { id }, data: { status: 'FAILED' } }); }
}
