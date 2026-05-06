import { redirect } from 'next/navigation';
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';

export default async function Admin() {
  const { user } = await withAuth();

  if (!user) {
    redirect('/');
  }

  let roleSlug: string | undefined;

  try {
    const workos = getWorkOS();
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
    });
    const rawSlug = memberships.data[0]?.role?.slug;
    roleSlug = rawSlug?.includes('-') ? rawSlug.split('-').slice(1).join('-') : rawSlug;
  } catch (error) {
    console.error('[Admin guard] role lookup failed', error);
  }

  if (roleSlug !== 'admin') {
    redirect('/');
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">Admin Page</h2>
      <p>This page is for admin users only. If you can see this, you are an admin!</p>
    </div>
  );
}