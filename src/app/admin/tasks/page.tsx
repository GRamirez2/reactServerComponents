import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { TaskList } from '@/app/doctor/TaskList';
import { syncAuthUserFromWorkOS } from '@/lib/auth/workosAdminSync';
import { listUsersByRoles } from '@/lib/repositories/usersRepository';
import { updateTaskCompletedByAdmin } from '@/lib/repositories/tasksRepository';
import { AdminTaskUserSelector } from './TaskUserSelector';

type AdminTasksSearchParams = Promise<{
  userId?: string;
}>;

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

  const [{ isWorkOSAdmin }, selectableUsers] = await Promise.all([
    syncAuthUserFromWorkOS(user),
    listUsersByRoles(['DOCTOR', 'ASSISTANT']),
  ]);

  if (!isWorkOSAdmin) {
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

    const { isWorkOSAdmin: actionIsWorkOSAdmin } =
      await syncAuthUserFromWorkOS(actionUser);
    if (!actionIsWorkOSAdmin) {
      redirect('/');
    }

    const taskId = String(formData.get('taskId') ?? '');
    const completed = formData.get('completed') === 'true';

    if (!taskId) {
      redirect('/admin/tasks');
    }

    const result = await updateTaskCompletedByAdmin({ taskId, completed });
    if (!result.ok) {
      redirect('/admin/tasks');
    }

    revalidatePath('/admin/tasks');
    redirect(
      selectedUser
        ? `/admin/tasks?userId=${encodeURIComponent(selectedUser.id)}`
        : '/admin/tasks',
    );
  }

  const selectedUserId = selectedUser?.id;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Tasks</h3>
        <p className="text-sm text-slate-600">
          Pick an email to view that doctor or assistant&apos;s tasks.
        </p>
      </div>

      {selectableUsers.length > 0 ? (
        <>
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

                await updateCompletedAction(formData);
              }}
            />
          ) : (
            <p className="text-sm text-slate-600">
              Select a doctor or assistant email to load their tasks.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-600">
          No doctors or assistants were found in the users table.
        </p>
      )}
    </div>
  );
}
