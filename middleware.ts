import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import { locales } from './src/i18n/config';
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
  // Normalize pathname by stripping a leading locale segment if present
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0];
  const normalizedPath = (locales as readonly string[]).includes(first || '')
    ? `/${segments.slice(1).join('/')}`
    : url.pathname;

  if (normalizedPath.startsWith('/admin')) {
    // Debug logging in development to verify guard runs
    if (process.env.NODE_ENV !== 'production') {
      console.log('[middleware] admin path', {
        url: url.pathname,
        normalizedPath,
        haveUser: !!process.env.ADMIN_USER,
        havePass: !!process.env.ADMIN_PASS,
        hasAuthHeader: !!req.headers.get('authorization'),
      });
    }
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
