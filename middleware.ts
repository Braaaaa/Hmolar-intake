import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import { routing } from './src/i18n/routing';

// Compose admin Basic Auth with internationalized routing.
const intlMiddleware = createMiddleware(routing);

function unauthorized(): NextResponse {
  const res = new NextResponse('Unauthorized', { status: 401 });
  res.headers.set('WWW-Authenticate', 'Basic realm="Admin", charset="UTF-8"');
  return res;
}

function basicAuthOk(req: Request): boolean {
  const header = req.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('basic ')) return false;
  try {
    // Decode Base64 credentials using Web API available in Edge runtime
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(':');
    const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
    const pass = idx >= 0 ? decoded.slice(idx + 1) : '';
    return user === (process.env.ADMIN_USER || '') && pass === (process.env.ADMIN_PASS || '');
  } catch {
    return false;
  }
}

export default function middleware(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/admin')) {
    const haveCfg = !!process.env.ADMIN_USER && !!process.env.ADMIN_PASS;
    if (!haveCfg) return new NextResponse('Admin auth not configured', { status: 503 });
    if (!basicAuthOk(req)) return unauthorized();
    // Auth OK, continue to next-intl + route handling
    return intlMiddleware(req as unknown as Parameters<typeof intlMiddleware>[0]);
  }
  return intlMiddleware(req as unknown as Parameters<typeof intlMiddleware>[0]);
}

export const config = {
  // Apply to all non-static, non-API paths (admin included)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
