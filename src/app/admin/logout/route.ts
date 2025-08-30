import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  clearSessionCookie();
  return NextResponse.redirect('/admin/login');
}
