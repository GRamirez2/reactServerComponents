import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { users, usersSimple } from '@/lib/schema';

export type User = typeof usersSimple.$inferSelect;
export type AppUser = typeof users.$inferSelect;

export async function listUsers(): Promise<User[]> {
  return db.select().from(usersSimple).orderBy(usersSimple.id);
}

export async function listUsersByWorkosId(workosId: string): Promise<User[]> {
  return db
    .select()
    .from(usersSimple)
    .where(eq(usersSimple.workosId, workosId))
    .orderBy(usersSimple.createdAt);
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
