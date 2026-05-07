import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';
import DoctorsOnly from './DoctorsOnly';
import { UsersList } from './UsersList';
import { getUserById } from '@/lib/repositories/usersRepository';

export default async function Doctor() {
  const { user } = await withAuth();

  if (!user) {
    redirect('/');
  }

  const appUser = await getUserById(user.id);
  if (!appUser || (appUser.role !== 'DOCTOR' && appUser.role !== 'ASSISTANT')) {
    redirect('/');
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">Doctor Page</h2>
      <p>
        This page is for doctor and fellow users only. If you can see this, you
        are a doctor or fellow!
      </p>

      <Suspense fallback={<p>Loading users...</p>}>
        {appUser.role === 'DOCTOR' && <DoctorsOnly />}
        <UsersList workosId={user.id} />
      </Suspense>
    </div>
  );
}
