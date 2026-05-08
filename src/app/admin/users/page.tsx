import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { getWorkOS } from '@workos-inc/authkit-nextjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import UsersToast from './UsersToast';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ['ADMIN', 'DOCTOR', 'ASSISTANT', 'MEMBER'] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number];

type WorkOSUserSummary = {
  id: string;
  email: string | null;
};

type SyncResult = {
  totalWorkOSUsers: number;
  insertedUsersCount: number;
  updatedUsersCount: number;
  skippedUsersCount: number;
  skippedConflictCount: number;
};

type UsersSearchParams = Promise<{
  q?: string;
  role?: string;
  page?: string;
  toast?: string;
  details?: string;
}>;

async function listAllWorkOSUsers(): Promise<WorkOSUserSummary[]> {
  const workos = getWorkOS();
  const paginatedUsers = await workos.userManagement.listUsers();
  const allUsers = await paginatedUsers.autoPagination();

  return allUsers.map((user) => ({
    id: user.id,
    email: user.email,
  }));
}

function normalizeRole(value: string | null | undefined): RoleValue | 'ALL' {
  if (!value) return 'ALL';
  if (value === 'ALL') return 'ALL';
  if (ROLE_OPTIONS.includes(value as RoleValue)) return value as RoleValue;
  return 'ALL';
}

function toPositivePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildUsersPageHref(options: {
  q?: string;
  role?: string;
  page?: number;
  toast?: string;
  details?: string;
}): string {
  const params = new URLSearchParams();

  if (options.q) {
    params.set('q', options.q);
  }

  if (options.role && options.role !== 'ALL') {
    params.set('role', options.role);
  }

  if (options.page && options.page > 1) {
    params.set('page', String(options.page));
  }

  if (options.toast) {
    params.set('toast', options.toast);
  }

  if (options.details) {
    params.set('details', options.details);
  }

  const query = params.toString();
  return query ? `/admin/users?${query}` : '/admin/users';
}

async function syncUsersFromWorkOS(): Promise<SyncResult> {
  let totalWorkOSUsers = 0;
  let insertedUsersCount = 0;
  let updatedUsersCount = 0;
  let skippedUsersCount = 0;
  let skippedConflictCount = 0;

  const workosUsers = await listAllWorkOSUsers();
  totalWorkOSUsers = workosUsers.length;

  const existingUsers = await db.select().from(users);
  const existingUsersById = new Map(
    existingUsers.map((user) => [user.id, user]),
  );
  const existingUsersByEmail = new Map(
    existingUsers.map((user) => [user.email, user]),
  );

  const usersToInsert: Array<typeof users.$inferInsert> = [];
  const usersToUpdate: Array<{ id: string; email: string }> = [];

  for (const workosUser of workosUsers) {
    if (!workosUser.email) {
      skippedUsersCount += 1;
      continue;
    }

    const existingUser = existingUsersById.get(workosUser.id);

    if (!existingUser) {
      const emailOwner = existingUsersByEmail.get(workosUser.email);
      if (emailOwner && emailOwner.id !== workosUser.id) {
        skippedConflictCount += 1;
        continue;
      }

      usersToInsert.push({
        id: workosUser.id,
        email: workosUser.email,
        role: 'MEMBER',
      });
      existingUsersByEmail.set(workosUser.email, {
        id: workosUser.id,
        email: workosUser.email,
        role: 'MEMBER',
      });
      continue;
    }

    if (existingUser.email !== workosUser.email) {
      usersToUpdate.push({ id: workosUser.id, email: workosUser.email });
    }
  }

  if (usersToInsert.length > 0) {
    await db.insert(users).values(usersToInsert);
    insertedUsersCount = usersToInsert.length;
  }

  if (usersToUpdate.length > 0) {
    await Promise.all(
      usersToUpdate.map(({ id, email }) =>
        db.update(users).set({ email }).where(eq(users.id, id)),
      ),
    );
    updatedUsersCount = usersToUpdate.length;
  }

  return {
    totalWorkOSUsers,
    insertedUsersCount,
    updatedUsersCount,
    skippedUsersCount,
    skippedConflictCount,
  };
}

function getUserStatus(role: RoleValue): string {
  if (role === 'MEMBER') {
    return 'Pending assignment';
  }

  return 'Assigned';
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: UsersSearchParams;
}) {
  const params = await searchParams;
  const query = (params.q ?? '').trim();
  const roleFilter = normalizeRole(params.role);
  const currentPage = toPositivePage(params.page);
  const toast = params.toast;
  const details = params.details;

  const whereClauses = [];

  if (query) {
    whereClauses.push(ilike(users.email, `%${query}%`));
  }

  if (roleFilter !== 'ALL') {
    whereClauses.push(eq(users.role, roleFilter));
  }

  const whereCondition =
    whereClauses.length > 1
      ? and(...whereClauses)
      : (whereClauses[0] ?? undefined);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(whereCondition);

  const totalUsers = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  const dbUsers = await db
    .select()
    .from(users)
    .where(whereCondition)
    .orderBy(asc(users.email))
    .limit(PAGE_SIZE)
    .offset(offset);

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  async function syncUsersAction(formData: FormData) {
    'use server';

    const q = String(formData.get('q') ?? '').trim();
    const role = normalizeRole(String(formData.get('role') ?? 'ALL'));
    const pageValue = toPositivePage(String(formData.get('page') ?? '1'));

    try {
      const result = await syncUsersFromWorkOS();
      revalidatePath('/admin/users');
      redirect(
        buildUsersPageHref({
          q,
          role,
          page: pageValue,
          toast: 'success',
          details: `Synced ${result.totalWorkOSUsers}. Inserted ${result.insertedUsersCount}, updated ${result.updatedUsersCount}, skipped ${result.skippedUsersCount} no-email, conflicts ${result.skippedConflictCount}.`,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown WorkOS sync failure.';
      redirect(
        buildUsersPageHref({
          q,
          role,
          page: pageValue,
          toast: 'error',
          details: message,
        }),
      );
    }
  }

  async function updateRoleAction(formData: FormData) {
    'use server';

    const userId = String(formData.get('userId') ?? '');
    const role = String(formData.get('role') ?? '');
    const q = String(formData.get('q') ?? '').trim();
    const roleFilterFromForm = normalizeRole(
      String(formData.get('roleFilter') ?? 'ALL'),
    );
    const pageValue = toPositivePage(String(formData.get('page') ?? '1'));

    if (!userId || !ROLE_OPTIONS.includes(role as RoleValue)) {
      redirect(
        buildUsersPageHref({
          q,
          role: roleFilterFromForm,
          page: pageValue,
          toast: 'error',
          details: 'Invalid user or role selection.',
        }),
      );
    }

    await db
      .update(users)
      .set({ role: role as RoleValue })
      .where(eq(users.id, userId));

    revalidatePath('/admin/users');
    redirect(
      buildUsersPageHref({
        q,
        role: roleFilterFromForm,
        page: pageValue,
        toast: 'success',
        details: 'User role updated.',
      }),
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Users</h3>
          <p className="text-sm text-slate-600">
            Manage users, assign roles, and sync records from WorkOS.
          </p>
        </div>

        <form action={syncUsersAction}>
          <input type="hidden" name="q" value={query} />
          <input type="hidden" name="role" value={roleFilter} />
          <input type="hidden" name="page" value={String(page)} />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            Sync WorkOS
          </button>
        </form>
      </div>

      {toast && details ? (
        <UsersToast
          tone={toast === 'error' ? 'error' : 'success'}
          message={details}
        />
      ) : null}

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_auto]">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Search email</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="name@company.com"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 outline-none ring-slate-900 transition focus:ring-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Role</span>
          <select
            name="role"
            defaultValue={roleFilter}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-slate-900 transition focus:ring-2"
          >
            <option className="text-slate-900" value="ALL">
              All roles
            </option>
            {ROLE_OPTIONS.map((role) => (
              <option className="text-slate-900" key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Apply
          </button>
          <a
            href="/admin/users"
            className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </a>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>
            Showing {dbUsers.length} of {totalUsers} users
          </p>
          <p>
            Page {page} of {totalPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {dbUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={4}>
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                dbUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 align-middle">
                      <p className="font-medium text-slate-900">{user.email}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {user.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <form
                        action={updateRoleAction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="q" value={query} />
                        <input
                          type="hidden"
                          name="roleFilter"
                          value={roleFilter}
                        />
                        <input type="hidden" name="page" value={String(page)} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option
                              className="text-slate-900"
                              key={role}
                              value={role}
                            >
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.role === 'MEMBER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {getUserStatus(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-slate-500">
                      Last sync from WorkOS updates email only.
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <a
            href={
              hasPreviousPage
                ? buildUsersPageHref({
                    q: query,
                    role: roleFilter,
                    page: page - 1,
                  })
                : '#'
            }
            aria-disabled={!hasPreviousPage}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              hasPreviousPage
                ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-200 text-slate-400'
            }`}
          >
            Previous
          </a>

          <a
            href={
              hasNextPage
                ? buildUsersPageHref({
                    q: query,
                    role: roleFilter,
                    page: page + 1,
                  })
                : '#'
            }
            aria-disabled={!hasNextPage}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              hasNextPage
                ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-200 text-slate-400'
            }`}
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}
