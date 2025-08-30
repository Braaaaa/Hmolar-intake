import { cookies, headers } from 'next/headers';

import { scrypt as _scrypt, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

// Password hashing using scrypt. Stored format: scrypt$N$r$p$saltB64$hashB64
const SCRYPT_N = 1 << 14; // 16384
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${Buffer.from(
    derived,
  ).toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, nStr, rStr, pStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = (await scrypt(password, salt, expected.length, { N, r, p })) as Buffer;
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Session tokens: base64url(JSON).base64url(HMAC)
type SessionPayload = {
  uid: string;
  iat: number; // seconds
  exp: number; // seconds
  fp: string; // fingerprint
  ver: 1;
};

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Buffer.from(s + '='.repeat(pad), 'base64');
}

export function fingerprintFromHeaders(): string {
  const h = headers();
  const ua = h.get('user-agent') || '';
  const al = h.get('accept-language') || '';
  const data = Buffer.from(`${ua}|${al}`, 'utf8');
  const digest = createHmac('sha256', 'fp').update(data).digest();
  return b64url(digest);
}

export function signSession(payload: SessionPayload): string {
  const secret = process.env.SESSION_SECRET || '';
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = createHmac('sha256', secret).update(body).digest();
  return `${b64url(body)}.${b64url(sig)}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const secret = process.env.SESSION_SECRET || '';
    const [b, s] = token.split('.');
    if (!b || !s) return null;
    const body = fromB64url(b);
    const sig = fromB64url(s);
    const expected = createHmac('sha256', secret).update(body).digest();
    if (expected.length !== sig.length || !timingSafeEqual(expected, sig)) return null;
    const parsed = JSON.parse(body.toString('utf8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) return null;
    // Optional: verify fingerprint
    const fp = fingerprintFromHeaders();
    if (parsed.fp !== fp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(uid: string, maxAgeHours = 8) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + maxAgeHours * 60 * 60;
  const payload: SessionPayload = { uid, iat: now, exp, fp: fingerprintFromHeaders(), ver: 1 };
  const token = signSession(payload);
  const cookie = cookies();
  const isLocalhost = (headers().get('host') || '').startsWith('localhost');
  cookie.set('ADMIN_SESSION', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalhost,
    path: '/',
    maxAge: maxAgeHours * 60 * 60,
  });
}

export function clearSessionCookie() {
  const cookie = cookies();
  cookie.set('ADMIN_SESSION', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  });
}

export function getSession() {
  const token = cookies().get('ADMIN_SESSION')?.value || '';
  if (!token) return null;
  return verifySession(token);
}

// CSRF double-submit token for the login form
export function setCsrfToken() {
  const val = b64url(randomBytes(16));
  cookies().set('ADMIN_CSRF', val, { httpOnly: false, sameSite: 'lax', path: '/' });
  return val;
}

export function verifyCsrfToken(value: string | null | undefined): boolean {
  const stored = cookies().get('ADMIN_CSRF')?.value || '';
  if (!value) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
}
