import { redirect } from 'next/navigation';
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';
import AdminSubNav from './AdminSubNav';

const ADMIN_MENU_ITEMS = [
  { href: '/admin/schedule-uploads', label: 'Daily Uploads' },
  { href: '/admin/totals', label: 'Totals' },
  {
    href: '/admin/tasks/sample-task-id',
    label: 'Task Details',
    matchPrefix: '/admin/tasks',
  },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/specialties', label: 'Specialties' },
  { href: '/admin/relationships', label: 'Relationships' },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await withAuth();

  if (!user) {
    redirect('/');
  }

  let roleSlug: string | undefined;

  try {
    const workos = getWorkOS();
    const memberships = await workos.userManagement.listOrganizationMemberships(
      {
        userId: user.id,
      },
    );
    const rawSlug = memberships.data[0]?.role?.slug;
    roleSlug = rawSlug?.includes('-')
      ? rawSlug.split('-').slice(1).join('-')
      : rawSlug;
  } catch (error) {
    console.error('[Admin guard] role lookup failed', error);
  }

  if (roleSlug !== 'admin') {
    redirect('/');
  }

  return (
    <section className="my-8 space-y-6">
      <header className="space-y-3">
        <h2 className="text-2xl font-bold">Admin</h2>
        <AdminSubNav items={ADMIN_MENU_ITEMS} />
      </header>
      {children}
    </section>
  );
}
