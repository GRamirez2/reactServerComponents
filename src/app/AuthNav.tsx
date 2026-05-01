import Link from 'next/link';
import { signOut, withAuth } from '@workos-inc/authkit-nextjs';
import { getAppBaseUrl } from '@/lib/appUrl';

export default async function AuthNav() {
  const { user } = await withAuth();

  return (
    <nav className="flex items-center justify-between bg-gray-800 p-4 text-white">
      <h1>
        <Link href="/" className="text-2xl font-bold">
          Home
        </Link>
      </h1>

      {user ? (
        <div className="flex items-center gap-4">
          <span className="font-semibold">{user.firstName ?? user.email ?? 'Logged in'}</span>
          <form
            action={async () => {
              'use server';
              const appBaseUrl = await getAppBaseUrl();
              await signOut({ returnTo: `${appBaseUrl}/` });
            }}
          >
            <button type="submit" className="rounded bg-white px-3 py-1 text-sm font-semibold text-gray-800">
              Logout
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="rounded bg-white px-3 py-1 text-sm font-semibold text-gray-800">
          Login Yo
        </Link>
      )}
    </nav>
  );
}