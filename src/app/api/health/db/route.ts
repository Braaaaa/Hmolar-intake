import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DbUrlInfo =
  | { present: false }
  | {
      present: true;
      user?: string;
      host?: string;
      port?: string;
      db?: string;
      redacted?: string;
      parseError?: true;
    };

function safeParseDbUrl(raw?: string): DbUrlInfo {
  if (!raw) return { present: false };
  try {
    const tmp = raw.replace(/^postgres(ql)?:\/\//, 'http://');
    const u = new URL(tmp);
    const user = u.username || 'unknown';
    const host = u.hostname || 'unknown';
    const port = u.port || 'unknown';
    const db = (u.pathname || '').replace(/^\//, '') || 'unknown';
    return {
      present: true,
      user,
      host,
      port,
      db,
      redacted: `postgresql://${user}:***@${host}:${port}/${db}`,
    };
  } catch {
    return { present: true, parseError: true };
  }
}

/**
 * Health diagnostics for database connectivity and basic queries.
 * Returns env info and success/error for each step.
 */
export async function GET() {
  const diagnostics: {
    now: string;
    env: string;
    databaseUrl: DbUrlInfo;
    directUrl: DbUrlInfo;
    steps: {
      prismaConnect: { ok: boolean; error?: string };
      pingSelect1: { ok: boolean; error?: string };
      countIntakeSubmission: { ok: boolean; error?: string; count?: number };
    };
  } = {
    now: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown',
    databaseUrl: safeParseDbUrl(process.env.DATABASE_URL),
    directUrl: safeParseDbUrl(process.env.DIRECT_URL),
    steps: {
      prismaConnect: { ok: false },
      pingSelect1: { ok: false },
      countIntakeSubmission: { ok: false },
    },
  };

  try {
    await prisma.$connect();
    diagnostics.steps.prismaConnect.ok = true;
  } catch (e: unknown) {
    diagnostics.steps.prismaConnect.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, diagnostics }, { status: 500 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.steps.pingSelect1.ok = true;
  } catch (e: unknown) {
    diagnostics.steps.pingSelect1.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, diagnostics }, { status: 500 });
  }

  try {
    const count = await prisma.intakeSubmission.count();
    diagnostics.steps.countIntakeSubmission.ok = true;
    diagnostics.steps.countIntakeSubmission.count = count;
  } catch (e: unknown) {
    diagnostics.steps.countIntakeSubmission.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, diagnostics }, { status: 500 });
  }

  return NextResponse.json({ ok: true, diagnostics });
}
