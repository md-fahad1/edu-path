import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { secret?: string; paths?: unknown } | null;
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !body || body.secret !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === 'string' && p.startsWith('/')).slice(0, 50)
    : [];
  for (const p of paths) revalidatePath(p);
  return NextResponse.json({ ok: true, count: paths.length });
}