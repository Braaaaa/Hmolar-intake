import { headers } from 'next/headers';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = headers();

  const user = process.env.ADMIN_USER || '';
  const pass = process.env.ADMIN_PASS || '';
  const haveCfg = Boolean(user && pass);

  let authorized = false;
  const auth = hdrs.get('authorization') || '';
  if (auth.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const i = decoded.indexOf(':');
      const u = i >= 0 ? decoded.slice(0, i) : decoded;
      const p = i >= 0 ? decoded.slice(i + 1) : '';
      authorized = u === user && p === pass;
    } catch {
      authorized = false;
    }
  }

  if (!haveCfg) {
    return (
      <main className="mx-auto max-w-xl p-6 text-sm">
        <h1 className="mb-3 text-lg font-semibold">Admin auth not configured</h1>
        <p>Set ADMIN_USER and ADMIN_PASS in your environment and restart the server.</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto max-w-xl p-6 text-sm">
        <h1 className="mb-3 text-lg font-semibold">Unauthorized</h1>
        <p>
          Access to this page is restricted. Please refresh using HTTP Basic Auth credentials
          configured by the administrator.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
