import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@workos-inc/authkit-nextjs';
import DoctorsOnly from './DoctorsOnly';
import { TaskList } from './TaskList';
import RelationshipsToast from '@/app/admin/relationships/RelationshipsToast';
import { getUserById } from '@/lib/repositories/usersRepository';
import { updateTaskCompletedForUser } from '@/lib/repositories/tasksRepository';

type DoctorSearchParams = Promise<{
  toast?: string;
  details?: string;
}>;

function buildDoctorPageHref(options?: { toast?: string; details?: string }) {
  const params = new URLSearchParams();

  if (options?.toast) {
    params.set('toast', options.toast);
  }

  if (options?.details) {
    params.set('details', options.details);
  }

  const query = params.toString();
  return query ? `/doctor?${query}` : '/doctor';
}

export default async function Doctor({
  searchParams,
}: {
  searchParams: DoctorSearchParams;
}) {
  const params = await searchParams;
  const toast = params.toast;
  const details = params.details;

  const { user } = await withAuth();

  if (!user) {
    redirect('/');
  }

  const appUser = await getUserById(user.id);
  if (!appUser || (appUser.role !== 'DOCTOR' && appUser.role !== 'ASSISTANT')) {
    redirect('/');
  }

  async function updateCompletedAction(formData: FormData) {
    'use server';

    const { user: actionUser } = await withAuth();

    if (!actionUser) {
      redirect('/');
    }

    const taskId = String(formData.get('taskId') ?? '');
    const completed = formData.get('completed') === 'true';

    if (!taskId) {
      redirect(
        buildDoctorPageHref({
          toast: 'error',
          details: 'Missing task id.',
        }),
      );
    }

    const result = await updateTaskCompletedForUser({
      userId: actionUser.id,
      taskId,
      completed,
    });

    if (!result.ok) {
      redirect(
        buildDoctorPageHref({
          toast: 'error',
          details: result.message,
        }),
      );
    }

    revalidatePath('/doctor');
    redirect(
      buildDoctorPageHref({
        toast: 'success',
        details: 'Task updated.',
      }),
    );
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-4">Doctor Page</h2>
      <p>
        This page is for doctor and fellow users only. If you can see this, you
        are a doctor or an Assistant!
      </p>

      {toast && details ? (
        <RelationshipsToast
          tone={toast === 'error' ? 'error' : 'success'}
          message={details}
        />
      ) : null}

      <Suspense fallback={<p>Loading tasks...</p>}>
        {appUser.role === 'DOCTOR' && <DoctorsOnly />}
        <TaskList
          userId={appUser.id}
          userEmail={appUser.email}
          updateCompletedAction={updateCompletedAction}
        />
      </Suspense>
    </div>
  );
}
