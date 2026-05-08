'use client';

import { useRef } from 'react';

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
  };
  updateCompletedAction: (formData: FormData) => Promise<void>;
}

export function TaskRow({ task, updateCompletedAction }: TaskRowProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  const isCompleted = selectRef.current?.value === 'true' ?? task.completed;

  return (
    <tr>
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
          ref={selectRef}
          name="completed"
          form={`task-update-${task.id}`}
          defaultValue={task.completed ? 'true' : 'false'}
          className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
          onChange={() => {
            // Re-render to update button styling
            selectRef.current?.form?.dispatchEvent(
              new Event('change', { bubbles: true }),
            );
          }}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className="px-3 py-4 align-middle">
        <form
          id={`task-update-${task.id}`}
          action={updateCompletedAction}
          onChange={(e) => {
            // Trigger re-render on select change
            selectRef.current?.dispatchEvent(
              new Event('change', { bubbles: true }),
            );
          }}
        >
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
