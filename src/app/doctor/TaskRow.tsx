'use client';

import { useState } from 'react';

interface TaskRowProps {
  task: {
    id: string;
    specimanName: string;
    doctorEmail: string;
    specimenId?: string | null;
    caseId?: string | null;
    specFrozen: boolean;
    completed: boolean;
    points?: number | null;
    uploadedAt?: Date | null;
    uploadId?: number | null;
  };
  updateCompletedAction: (formData: FormData) => Promise<void>;
}

export function TaskRow({ task, updateCompletedAction }: TaskRowProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed);

  return (
    <tr>
      <td className="px-3 py-4 align-middle text-slate-700">
        {task.uploadedAt ? (
          <>
            <p>{task.uploadedAt.toLocaleDateString()}</p>
            <p className="text-xs text-slate-500">id: {task.uploadId ?? '—'}</p>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-3 py-4 align-middle text-slate-800">
        <p className="truncate font-medium" title={task.specimanName}>
          {task.specimanName}
        </p>
        <p className="truncate text-xs text-slate-500" title={task.doctorEmail}>
          Doctor: {task.doctorEmail}
        </p>
      </td>
      <td className="px-3 py-4 align-middle text-slate-700">
        {task.specimenId ?? 'N/A'}
      </td>
      <td className="px-3 py-4 align-middle text-slate-700">
        {task.caseId ?? 'N/A'}
      </td>
      <td className="px-3 py-4 align-middle text-slate-700">
        {task.specFrozen ? 'Yes' : 'No'}
      </td>
      <td className="px-3 py-4 align-middle">
        <select
          name="completed"
          form={`task-update-${task.id}`}
          defaultValue={isCompleted ? 'true' : 'false'}
          className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
          onChange={(e) => {
            setIsCompleted(e.target.value === 'true');
          }}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className="px-3 py-4 align-middle">
        <form id={`task-update-${task.id}`} action={updateCompletedAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <button
            type="submit"
            className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              isCompleted
                ? 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                : 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {isCompleted ? 'Change' : 'Save'}
          </button>
        </form>
      </td>
      <td className="px-3 py-4 align-middle text-slate-700">
        {task.points ?? 0}
      </td>
    </tr>
  );
}
