import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { usersSimple } from '@/lib/schema';

export type User = typeof usersSimple.$inferSelect;

export async function listUsers(): Promise<User[]> {
  return db.select().from(usersSimple).orderBy(usersSimple.id);
}

export async function listUsersByWorkosId(workosId: string): Promise<User[]> {
  return db.select().from(usersSimple).where(eq(usersSimple.workosId, workosId)).orderBy(usersSimple.createdAt);
}
