import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as schema from '../src/lib/schema';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

async function seed() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users_simple (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      workos_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS specialties (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await db.execute(sql`
    DELETE FROM users_simple WHERE email IN ('alice@example.com', 'bob@example.com', 'carol@example.com', 'leroy@example.com')
  `);

  await db
    .insert(schema.usersSimple)
    .values([
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        workosId: 'user_01KQG3EA5ADQ3N8KFEYKQNTPMA',
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        workosId: 'user_01KQG3EA5ADQ3N8KFEYKQNTPMA',
      },
      {
        name: 'Carol White',
        email: 'carol@example.com',
        workosId: 'user_01KQJGH36JGSQY92VB9W8ZH1QJ',
      },
      {
        name: 'Leroy Jenkins',
        email: 'leroy@example.com',
        workosId: 'user_01KQJGH36JGSQY92VB9W8ZH1QJ',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.specialties)
    .values([
      { code: 'BLOOD', name: 'Blood' },
      { code: 'TISSUE', name: 'Tissue' },
      { code: 'BONE', name: 'Bone' },
    ])
    .onConflictDoNothing();

  console.log('Seeded users_simple table with 4 rows.');
  console.log(
    'Seeded specialties table with baseline rows (Blood, Tissue, Bone).',
  );
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
