'use client';

import type { AppUser } from '@/lib/repositories/usersRepository';

interface AdminTaskUserSelectorProps {
  selectableUsers: AppUser[];
  selectedUserId?: string;
}

export function AdminTaskUserSelector({
  selectableUsers,
  selectedUserId,
}: AdminTaskUserSelectorProps) {
  return (
    <form method="get" className="max-w-md space-y-2">
      <label
        htmlFor="tasks-user"
        className="block text-sm font-medium text-slate-700"
      >
        User email
      </label>
      <select
        id="tasks-user"
        name="userId"
        defaultValue={selectedUserId ?? ''}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">Select a user...</option>
        {selectableUsers.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.email} ({candidate.role.toLowerCase()})
          </option>
        ))}
      </select>
    </form>
  );
}