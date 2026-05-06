import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';
import DoctorsOnly from './DoctorsOnly';
import { UsersList } from './UsersList';

const ALLOWED_ROLES = new Set(['doctor', 'fellow', 'admin']);

export default async function Doctor() {
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
    console.error('[Doctor guard] role lookup failed', error);
  }

  if (!roleSlug || !ALLOWED_ROLES.has(roleSlug)) {
    redirect('/');
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">Doctor Page</h2>
      <p>This page is for doctor and fellow users only. If you can see this, you are a doctor or fellow!</p>
      {(roleSlug === 'doctor' || roleSlug === 'admin') && <DoctorsOnly />}
      <Suspense fallback={<p>Loading users...</p>}>
        <UsersList workosId={user.id} />
      </Suspense>
    </div>
  );
}