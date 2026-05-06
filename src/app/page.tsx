import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';

const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin',
  doctor: '/doctor',
  member: '/info',
  fellow: '/doctor',
};

export default async function Home() {
  const { user } = await withAuth();
  console.log('[Home] user = ', user);
  let destination: string | null = null;

  if (user) {
    try {
      const workos = getWorkOS();
      const memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
      });

      const rawSlug = memberships.data[0]?.role?.slug;
      const roleSlug = rawSlug?.includes('-') ? rawSlug.split('-').slice(1).join('-') : rawSlug;
      destination = roleSlug ? ROLE_ROUTES[roleSlug] : null;

      if (destination) {
        console.log(`[Home] Redirecting user with role '${roleSlug}' to ${destination}`);
      }
    } catch (error) {
      console.error('[Home role redirect error]', error);
    }
  }

  if (destination) {
    redirect(destination);
  }

  const buttonClassName =
    'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2';

  if (!user) {
    return <h1>Login to see the good stuff.</h1>;
  }

  return (
    <div className="mt-3 flex flex-col gap-2 text-xl">
      <Link className={buttonClassName} href="/people">
        Parse xlsx documents
      </Link>
      <Link className={buttonClassName} href="/info">
        Random Cocktail + DB Users
      </Link>
    </div>
  );
}
