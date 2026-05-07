import db, { type DbClient } from '@/lib/db';

export type User = {
  id: number;
  name: string;
  email: string;
  workos_id: string | null;
  created_at: Date;
};

export async function listUsers(client: DbClient = db): Promise<User[]> {
  const result = await client.query<User>('SELECT * FROM users_simple ORDER BY id');
  return result.rows;
}

export async function listUsersByWorkosId(workosId: string, client: DbClient = db): Promise<User[]> {
  const result = await client.query<User>('SELECT * FROM users_simple WHERE workos_id = $1 ORDER BY id', [workosId]);
  return result.rows;
}
