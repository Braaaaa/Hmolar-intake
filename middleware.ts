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
    // Allow login endpoints without session
    if (normalizedPath.startsWith('/admin/login')) {
      return intlMiddleware(req as unknown as Parameters<typeof intlMiddleware>[0]);
    }
    // Check for presence of session cookie; detailed verification happens server-side
    const cookie = (req.headers.get('cookie') || '')
      .split(';')
      .find((c) => c.trim().startsWith('ADMIN_SESSION='));
    const token = cookie ? decodeURIComponent(cookie.split('=')[1].trim()) : '';
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('returnTo', url.pathname + url.search);
      return NextResponse.redirect(loginUrl);
    }
    return intlMiddleware(req as unknown as Parameters<typeof intlMiddleware>[0]);
  }
  return intlMiddleware(req as unknown as Parameters<typeof intlMiddleware>[0]);
}

export const config = {
  // Only run middleware on admin routes (with and without a locale prefix)
  matcher: ['/admin/:path*', '/:locale/admin/:path*'],
};
