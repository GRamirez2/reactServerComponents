import { and, asc, eq, inArray, ne, or } from 'drizzle-orm';
import db from '@/lib/db';
import { doctorAssistantMapping, tasks, uploads, users } from '@/lib/schema';

export type VisibleTask = {
  id: string;
  doctorId: string;
  doctorEmail: string;
  specimanName: string;
  specimenId: number | null;
  caseId: number | null;
  specFrozen: boolean | null;
  completed: boolean | null;
  points: number | null;
  uploadedAt: Date | null;
  uploadId: number | null;
};

async function listDoctorIdsForAssistant(
  assistantId: string,
): Promise<string[]> {
  const mappings = await db
    .select({ doctorId: doctorAssistantMapping.doctorId })
    .from(doctorAssistantMapping)
    .where(
      and(
        eq(doctorAssistantMapping.assistantId, assistantId),
        or(
          eq(doctorAssistantMapping.status, 'ACTIVE'),
          eq(doctorAssistantMapping.status, 'TEMPORARY'),
        ),
      ),
    );

  return Array.from(new Set(mappings.map((mapping) => mapping.doctorId)));
}

export async function listVisibleTasksForUser(
  userId: string,
): Promise<VisibleTask[]> {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const appUser = userRows[0];

  if (!appUser) {
    return [];
  }

  let visibleDoctorIds: string[] = [];

  if (appUser.role === 'DOCTOR') {
    visibleDoctorIds = [appUser.id];
  }

  if (appUser.role === 'ASSISTANT') {
    visibleDoctorIds = await listDoctorIdsForAssistant(appUser.id);
  }

  if (visibleDoctorIds.length === 0) {
    return [];
  }

  const taskRows = await db
    .select({
      id: tasks.id,
      doctorId: tasks.doctorId,
      specimanName: tasks.specimanName,
      specimenId: tasks.specimenId,
      caseId: tasks.caseId,
      specFrozen: tasks.specFrozen,
      completed: tasks.completed,
      points: tasks.points,
      uploadedAt: uploads.createdAt,
      uploadId: tasks.uploadId,
    })
    .from(tasks)
    .leftJoin(uploads, eq(tasks.uploadId, uploads.id))
    .where(inArray(tasks.doctorId, visibleDoctorIds))
    .orderBy(asc(tasks.completed), asc(tasks.specimanName), asc(tasks.caseId));

  if (taskRows.length === 0) {
    return [];
  }

  const doctorRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, visibleDoctorIds));

  const doctorEmailMap = new Map(
    doctorRows.map((doctor) => [doctor.id, doctor.email]),
  );

  return taskRows.map((task) => ({
    id: task.id,
    doctorId: task.doctorId,
    doctorEmail: doctorEmailMap.get(task.doctorId) ?? 'Unknown doctor',
    specimanName: task.specimanName,
    specimenId: task.specimenId,
    caseId: task.caseId,
    specFrozen: task.specFrozen,
    completed: task.completed,
    points: task.points,
    uploadedAt: task.uploadedAt ?? null,
    uploadId: task.uploadId ?? null,
  }));
}

export async function updateTaskCompletedForUser(input: {
  userId: string;
  taskId: string;
  completed: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [userRow, taskRow] = await Promise.all([
    db.select().from(users).where(eq(users.id, input.userId)).limit(1),
    db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1),
  ]);

  const appUser = userRow[0];
  const task = taskRow[0];

  if (!appUser || !task) {
    return { ok: false, message: 'Task or user not found.' };
  }

  let canEdit = false;

  if (appUser.role === 'DOCTOR' && task.doctorId === appUser.id) {
    canEdit = true;
  }

  if (appUser.role === 'ASSISTANT') {
    const mappingRows = await db
      .select({ id: doctorAssistantMapping.id })
      .from(doctorAssistantMapping)
      .where(
        and(
          eq(doctorAssistantMapping.doctorId, task.doctorId),
          eq(doctorAssistantMapping.assistantId, appUser.id),
          ne(doctorAssistantMapping.status, 'INACTIVE'),
        ),
      )
      .limit(1);

    canEdit = mappingRows.length > 0;
  }

  if (!canEdit) {
    return { ok: false, message: 'You are not allowed to update this task.' };
  }

  await db
    .update(tasks)
    .set({ completed: input.completed })
    .where(eq(tasks.id, input.taskId));

  return { ok: true };
}

export async function updateTaskCompletedByAdmin(input: {
  taskId: string;
  completed: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const taskRow = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, input.taskId))
    .limit(1);

  if (!taskRow[0]) {
    return { ok: false, message: 'Task not found.' };
  }

  await db
    .update(tasks)
    .set({ completed: input.completed })
    .where(eq(tasks.id, input.taskId));

  return { ok: true };
}
