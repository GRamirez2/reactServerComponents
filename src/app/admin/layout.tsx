import { redirect } from 'next/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { syncAuthUserFromWorkOS } from '@/lib/auth/workosAdminSync';
import AdminSubNav from './AdminSubNav';

const ADMIN_MENU_ITEMS = [
  { href: '/admin/schedule-uploads', label: 'Daily Uploads' },
  { href: '/admin/totals', label: 'Totals' },
  {
    href: '/admin/tasks',
    label: 'Tasks',
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

  const { isWorkOSAdmin } = await syncAuthUserFromWorkOS(user);

  if (!isWorkOSAdmin) {
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
