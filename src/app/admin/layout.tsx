import { cookies } from 'next/headers';

import { verifySession } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('ADMIN_SESSION')?.value || '';
  const session = token ? verifySession(token) : null;
  if (!session) {
    return (
      <main className="mx-auto max-w-xl p-6 text-sm">
        <h1 className="mb-3 text-lg font-semibold">Unauthorized</h1>
        <p>
          Access to this page is restricted. Please{' '}
          <a href="/admin/login" className="underline">
            sign in
          </a>{' '}
          to continue.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
