import { listVisibleTasksForUser } from '@/lib/repositories/tasksRepository';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  userId: string;
  userEmail: string;
  updateCompletedAction: (formData: FormData) => Promise<void>;
}

export async function TaskList({
  userId,
  userEmail,
  updateCompletedAction,
}: TaskListProps) {
  const tasks = await listVisibleTasksForUser(userId);

  return (
    <section className="my-8 space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold">Task List</h3>
        <p className="text-sm text-inherit">Signed in as: {userEmail}</p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
        <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-28 px-3 py-3">Created</th>
              <th className="w-64 px-3 py-3">Speciman Name</th>
              <th className="px-3 py-3">Speciman ID</th>
              <th className="px-3 py-3">Case ID</th>
              <th className="px-3 py-3">Spec Frozen</th>
              <th className="w-28 px-3 py-3">Completed</th>
              <th className="px-3 py-3">Action</th>
              <th className="w-20 px-3 py-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tasks.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={8}>
                  No tasks available for your doctor/assistant relationships.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={{
                    id: task.id,
                    specimanName: task.specimanName,
                    doctorEmail: task.doctorEmail,
                    specimenId: task.specimenId?.toString() ?? undefined,
                    caseId: task.caseId?.toString() ?? undefined,
                    specFrozen: task.specFrozen ?? false,
                    completed: task.completed ?? false,
                    points: task.points,
                    uploadedAt: task.uploadedAt,
                    uploadId: task.uploadId,
                  }}
                  updateCompletedAction={updateCompletedAction}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
