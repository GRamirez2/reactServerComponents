import { asc, eq, inArray } from 'drizzle-orm';
import db from '@/lib/db';
import { users } from '@/lib/schema';

export type AppUser = typeof users.$inferSelect;

export async function getUserById(id: string): Promise<AppUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listUsersByRoles(
  roles: Array<AppUser['role']>,
): Promise<AppUser[]> {
  if (roles.length === 0) {
    return [];
  }

  return db
    .select()
    .from(users)
    .where(inArray(users.role, roles))
    .orderBy(asc(users.email));
}
