import { NextResponse } from 'next/server';

import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyCsrfToken,
  verifyPassword,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  const csrf = String(form.get('csrf') || '');
  const returnTo = String(form.get('returnTo') || '/admin/intake');

  if (!verifyCsrfToken(csrf)) {
    return NextResponse.redirect(new URL('/admin/login?err=csrf', req.url));
  }

  const totalAdmins = await prisma.adminUser.count();
  if (totalAdmins === 0) {
    // Bootstrap initial admin
    if (!username || password.length < 8) {
      return NextResponse.redirect(new URL('/admin/login?err=bootstrap', req.url));
    }
    const passwordHash = await hashPassword(password);
    const created = await prisma.adminUser.create({ data: { username, passwordHash } });
    setSessionCookie(created.id);
    return NextResponse.redirect(new URL(returnTo, req.url));
  }

  const user = await prisma.adminUser.findUnique({ where: { username } });
  const now = new Date();
  if (!user) return NextResponse.redirect(new URL('/admin/login?err=invalid', req.url));
  if (user.lockedUntil && user.lockedUntil > now) {
    return NextResponse.redirect(new URL('/admin/login?err=locked', req.url));
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    let lockedUntil: Date | null = null;
    if (attempts >= 5) {
      // Lock for 10 minutes
      lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    }
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedAttempts: attempts, lockedUntil: lockedUntil },
    });
    return NextResponse.redirect(new URL('/admin/login?err=invalid', req.url));
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  setSessionCookie(user.id);
  return NextResponse.redirect(new URL(returnTo, req.url));
}

export async function GET() {
  // Not allowed; clear session and redirect to form
  clearSessionCookie();
  return NextResponse.redirect('/admin/login');
}
