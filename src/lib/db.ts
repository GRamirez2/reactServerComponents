import { Pool, type QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export type DbClient = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[] }>;
};

const db: DbClient = {
  query: async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ) => {
    const result = await pool.query<T>(text, params as unknown[] | undefined);
    return { rows: result.rows };
  },
};

export default db;
