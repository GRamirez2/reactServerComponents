import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      workos_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_workos_id_key
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workos_id TEXT
  `);

  await pool.query(`
  DELETE FROM users WHERE email IN ('alice@example.com', 'bob@example.com', 'carol@example.com', 'leroy@example.com')
`);

  await pool.query(`
    INSERT INTO users (name, email, workos_id) VALUES
      ('Alice Johnson', 'alice@example.com', 'user_01KQG3EA5ADQ3N8KFEYKQNTPMA'),
      ('Bob Smith', 'bob@example.com', 'user_01KQG3EA5ADQ3N8KFEYKQNTPMA'),
      ('Carol White', 'carol@example.com', 'user_01KQJGH36JGSQY92VB9W8ZH1QJ'),
      ('Leroy Jenkins', 'leroy@example.com', 'user_01KQJGH36JGSQY92VB9W8ZH1QJ')
    ON CONFLICT (email) DO NOTHING
  `);

  console.log('Seeded users table with 3 rows.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
