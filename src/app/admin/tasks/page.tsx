import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { TaskList } from '@/app/doctor/TaskList';
import {
  getUserById,
  listUsersByRoles,
} from '@/lib/repositories/usersRepository';
import { updateTaskCompletedByAdmin } from '@/lib/repositories/tasksRepository';
import { AdminTaskUserSelector } from './AdminTaskUserSelector';

type AdminTasksSearchParams = Promise<{
  userId?: string;
}>;

function buildAdminTasksHref(options?: { userId?: string }) {
  const params = new URLSearchParams();

  if (options?.userId) {
    params.set('userId', options.userId);
  }

  const query = params.toString();
  return query ? `/admin/tasks?${query}` : '/admin/tasks';
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: AdminTasksSearchParams;
}) {
  const params = await searchParams;
  const selectedUserIdParam = params.userId;

  const { user } = await withAuth();

  if (!user) {
    redirect('/');
  }

  const [actor, selectableUsers] = await Promise.all([
    getUserById(user.id),
    listUsersByRoles(['DOCTOR', 'ASSISTANT']),
  ]);

  if (!actor || actor.role !== 'ADMIN') {
    redirect('/');
  }

  const selectedUser = selectedUserIdParam
    ? selectableUsers.find((candidate) => candidate.id === selectedUserIdParam)
    : undefined;

  async function updateCompletedAction(formData: FormData) {
    'use server';

    const { user: actionUser } = await withAuth();
    if (!actionUser) {
      redirect('/');
    }

    const actionAppUser = await getUserById(actionUser.id);
    if (!actionAppUser || actionAppUser.role !== 'ADMIN') {
      redirect('/');
    }

    const taskId = String(formData.get('taskId') ?? '');
    const completed = formData.get('completed') === 'true';
    const selectedUserId = String(formData.get('selectedUserId') ?? '');

    if (!taskId || !selectedUserId) {
      redirect(buildAdminTasksHref({ userId: selectedUserId }));
    }

    const result = await updateTaskCompletedByAdmin({ taskId, completed });
    if (!result.ok) {
      redirect(buildAdminTasksHref({ userId: selectedUserId }));
    }

    revalidatePath('/admin/tasks');
    redirect(buildAdminTasksHref({ userId: selectedUserId }));
  }

  const selectedUserId = selectedUser?.id;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Tasks</h3>
        <p className="text-sm text-slate-600">
          Select a doctor or assistant email to view tasks using the same doctor
          task interface.
        </p>
      </div>

      <AdminTaskUserSelector
        selectableUsers={selectableUsers}
        selectedUserId={selectedUserId}
      />

      {selectedUser ? (
        <TaskList
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          updateCompletedAction={async (formData) => {
            'use server';

            formData.set('selectedUserId', selectedUser.id);
            await updateCompletedAction(formData);
          }}
        />
      ) : selectableUsers.length === 0 ? (
        <p className="text-sm text-slate-600">
          No doctors or assistants were found in the users table.
        </p>
      ) : null}
    </div>
  );
}
