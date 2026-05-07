import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';
import { getUserById } from '@/lib/repositories/usersRepository';

const DB_ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  ASSISTANT: '/doctor',
};

export default async function Home() {
  const { user } = await withAuth();

  if (user) {
    // Check WorkOS org membership for Admin role first
    try {
      const workos = getWorkOS();
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: user.id,
        });

      const rawSlug = memberships.data[0]?.role?.slug ?? '';
      const roleSlug = rawSlug.includes('-')
        ? rawSlug.split('-').slice(1).join('-')
        : rawSlug;

      if (roleSlug === 'admin') {
        redirect('/admin');
      }
    } catch (error) {
      console.error('[Home] WorkOS membership check error:', error);
    }

    // Fall back to DB role for routing
    const dbUser = await getUserById(user.id);

    if (dbUser && dbUser.role !== 'MEMBER') {
      const destination = DB_ROLE_ROUTES[dbUser.role];
      if (destination) {
        redirect(destination);
      }
    }
  }

  const buttonClassName =
    'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2';

  if (!user) {
    return <h1>Login to see the good stuff.</h1>;
  }

  return (
    <div className="mt-3 flex flex-col gap-2 text-xl">
      <p>
        If you see this page you are authenticated by workOS, but have the
        generic role of member. An admin has not assigned your role yet.
      </p>

      <Link className={buttonClassName} href="/info">
        Random Cocktail + DB Users
      </Link>
    </div>
  );
}
