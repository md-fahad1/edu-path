# শিক্ষাপথ – Bangla Education (MCQ) Platform

NestJS + Prisma + PostgreSQL (backend) · Next.js 16 + Tailwind CSS 4 (frontend). HSC / BCS / Admission MCQ, practice mode, timed model test, analytics, premium, admin panel.

## 1) Chalate hole (local)

Lagbe: Node 22+, Docker (ba nijer Postgres 16).

```bash
npm install                      # root theke, duita app-i install hobe
npm run db:up                    # Postgres chalu (docker)

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

cd apps/api
npx prisma migrate dev --name init   # table toiri (prothom bar)
npm run prisma:seed                  # demo data + user
cd ../..

npm run dev:api     # http://localhost:4000/api/v1   (Swagger: /docs)
npm run dev:web     # http://localhost:3000
```

Demo login (seed theke):

| Role | Email | Password |
|---|---|---|
| Admin | admin@edu.local | Admin@12345 |
| Teacher | teacher@edu.local | Teacher@12345 |
| Student | student@edu.local | Student@12345 |

**Deploy-er age password/secret bodlan** (`JWT_*_SECRET`, `SEED_ADMIN_PASSWORD`).

## 2) Folder

```
apps/api   NestJS API  (auth, catalog, questions, exams, tests, practice, analytics, bookmarks, reports, search, subscriptions, admin, sitemap)
apps/web   Next.js     (public SEO pages, practice, test runner, result, dashboard, admin panel)
```

Frontend `/api/v1/*` call Next.js rewrite diye API-te jay (same-origin), tai CORS/cookie jhamela nei. `apps/web/.env.local`-e `API_URL` thik rakhun.

## 3) Ki ki ache

**Public (SSR/ISR, SEO):** home · category/subject/chapter pages (pagination, FAQ schema, breadcrumb schema) · single MCQ page (Question schema; explanation chhara hole `noindex`) · exam page · model-test list/landing/leaderboard · sitemap.xml · robots.txt · PWA manifest · legal pages (template).

**Student:** register/login (email ba BD phone) · practice mode (guest-o parbe) · timed model test · dashboard (accuracy, streak, weak topics, heatmap, history) · bookmarks · wrong-answer report · premium plan + manual bKash/Nagad payment.

**Test engine:** server-side timer (refresh/device change-e time thik thake) · answer auto-save · offline hole local backup + retry · question/option deterministic shuffle · server-e score calculate (client-e correct answer kokhono jay na) · negative marking · rank + leaderboard · mobile palette, keyboard shortcut.

**Admin / Teacher:** dashboard · question CRUD · review queue (A/E/R/S key) · bulk status · CSV import (preview -> commit, shob DRAFT) · catalog CRUD · test builder · reports · users/roles · plans · payment approve.

**Rule (code-e enforced):** Teacher DRAFT likhte pare; nijer question nije REVIEWED korte pare na; **PUBLISH shudhu Admin**; exactly 4 option + 1 correct; 3 ta open report hole question auto REVIEWED-e fire jay.

## 4) Ki ekhono nei (honest list)

Documentation-er sob advanced feature ei version-e nei:
- bKash/Nagad **live gateway** (`/payments/bkash/*` stub, 501 dey). Ekhon manual TrxID flow kaj kore.
- AI/PDF/image theke question extract (OCR/Vision), Redis cache, background queue, full-text search (ekhon `ILIKE`).
- Smart/spaced-repetition practice, PDF notes, email/push notification, live exam, mobile app, dark mode, ad slots.
- Image upload (question-e chhobi). Math formula (LaTeX) render.

## 5) Launch-er age obosshoi

1. **Seed-er 77 ta question demo/sample** (`source: নমুনা প্রশ্ন`, `answerVerified=false`). Real content nijer verified MCQ diye replace korun (Admin -> CSV import), tarpor demo gulo archive korun. Kono coaching guide ba onner site theke copy korben na.
2. Legal page (privacy/terms/refund), `support@example.com`, bKash number `01XXXXXXXXX` (`pricing/PlanCards.tsx`) nijer tottho diye bodlan.
3. `NEXT_PUBLIC_SITE_URL` production domain-e set korun (sitemap/canonical er jonno).
4. Production-e `NODE_ENV=production` (refresh cookie `secure` hoy). API ar web alada domain hole `COOKIE_SAMESITE=none` + `FRONTEND_URL` set.
5. **`next build`-er shomoy API chalu thakte hobe** (home/practice/pricing build-time-e data ane). Baki page ISR-e prothom request-e toiri hoy.
6. Optional: admin edit-er por turant page refresh chaile `apps/api/.env`-e `REVALIDATE_URL` + secret dien (web-e on-demand revalidate route add korte hobe; na dile `revalidate` time por update hoy).

## 6) Production

```bash
cd apps/api && npx prisma migrate deploy && npm run build && npm start
cd apps/web && npm run build && npm start
```
