import { count, desc, eq } from 'drizzle-orm';
import db from '@/lib/db';
import { tasks, uploads } from '@/lib/schema';

export type UploadWithTaskCount = {
  id: number;
  fileName: string;
  createdAt: Date | null;
  taskCount: number;
};

export async function listUploadsWithTaskCounts(): Promise<
  UploadWithTaskCount[]
> {
  const rows = await db
    .select({
      id: uploads.id,
      fileName: uploads.fileName,
      createdAt: uploads.createdAt,
      taskCount: count(tasks.id),
    })
    .from(uploads)
    .leftJoin(tasks, eq(tasks.uploadId, uploads.id))
    .groupBy(uploads.id)
    .orderBy(desc(uploads.createdAt));

  return rows.map((row) => ({
    ...row,
    taskCount: Number(row.taskCount),
  }));
}
