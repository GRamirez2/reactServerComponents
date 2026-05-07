import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import db from '@/lib/db';
import {
  doctorAssistantMapping,
  specialties,
  type roleEnum,
  type statusEnum,
  userSpecialties,
  users,
} from '@/lib/schema';

type RoleValue = (typeof roleEnum.enumValues)[number];
type MappingStatusValue = (typeof statusEnum.enumValues)[number];

export type RoleScopedUser = typeof users.$inferSelect;

export type DoctorAssistantRelationship = {
  id: string;
  doctorId: string;
  doctorEmail: string;
  assistantId: string;
  assistantEmail: string;
  isPrimary: boolean | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TEMPORARY' | null;
  assignedAt: Date | null;
};

export type DoctorSpecialtyRelationship = {
  doctorId: string;
  doctorEmail: string;
  specialtyId: number;
  specialtyCategory: string;
  specialtyCodeRange: string;
  isPrimary: boolean | null;
  createdAt: Date | null;
};

async function getUserMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, RoleScopedUser>();
  }

  const rows = await db.select().from(users).where(inArray(users.id, userIds));
  return new Map(rows.map((user) => [user.id, user]));
}

export async function listUsersByRole(
  role: RoleValue,
): Promise<RoleScopedUser[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .orderBy(asc(users.email));
}

export async function listDoctorAssistantRelationships(): Promise<
  DoctorAssistantRelationship[]
> {
  const mappings = await db
    .select()
    .from(doctorAssistantMapping)
    .orderBy(desc(doctorAssistantMapping.assignedAt));

  const userIds = Array.from(
    new Set(
      mappings.flatMap((mapping) => [mapping.doctorId, mapping.assistantId]),
    ),
  );
  const userMap = await getUserMap(userIds);

  return mappings
    .map((mapping) => {
      const doctor = userMap.get(mapping.doctorId);
      const assistant = userMap.get(mapping.assistantId);

      if (!doctor || !assistant) {
        return null;
      }

      return {
        id: mapping.id,
        doctorId: mapping.doctorId,
        doctorEmail: doctor.email,
        assistantId: mapping.assistantId,
        assistantEmail: assistant.email,
        isPrimary: mapping.isPrimary,
        status: mapping.status,
        assignedAt: mapping.assignedAt,
      } satisfies DoctorAssistantRelationship;
    })
    .filter(
      (mapping): mapping is DoctorAssistantRelationship => mapping !== null,
    );
}

export async function listDoctorSpecialtyRelationships(): Promise<
  DoctorSpecialtyRelationship[]
> {
  const mappings = await db
    .select()
    .from(userSpecialties)
    .orderBy(asc(userSpecialties.userId), asc(userSpecialties.specialtyId));

  const doctorIds = Array.from(
    new Set(mappings.map((mapping) => mapping.userId)),
  );
  const specialtyIds = Array.from(
    new Set(mappings.map((mapping) => mapping.specialtyId)),
  );

  const [doctorRows, specialtyRows] = await Promise.all([
    doctorIds.length === 0
      ? Promise.resolve([])
      : db.select().from(users).where(inArray(users.id, doctorIds)),
    specialtyIds.length === 0
      ? Promise.resolve([])
      : db
          .select()
          .from(specialties)
          .where(inArray(specialties.id, specialtyIds)),
  ]);

  const doctorMap = new Map(doctorRows.map((doctor) => [doctor.id, doctor]));
  const specialtyMap = new Map(
    specialtyRows.map((specialty) => [specialty.id, specialty]),
  );

  return mappings
    .map((mapping) => {
      const doctor = doctorMap.get(mapping.userId);
      const specialty = specialtyMap.get(mapping.specialtyId);

      if (!doctor || doctor.role !== 'DOCTOR' || !specialty) {
        return null;
      }

      return {
        doctorId: mapping.userId,
        doctorEmail: doctor.email,
        specialtyId: mapping.specialtyId,
        specialtyCategory: specialty.category,
        specialtyCodeRange: specialty.codeRange,
        isPrimary: mapping.isPrimary,
        createdAt: mapping.createdAt,
      } satisfies DoctorSpecialtyRelationship;
    })
    .filter(
      (mapping): mapping is DoctorSpecialtyRelationship => mapping !== null,
    )
    .sort((left, right) => {
      const emailResult = left.doctorEmail.localeCompare(right.doctorEmail);

      if (emailResult !== 0) {
        return emailResult;
      }

      return left.specialtyCategory.localeCompare(right.specialtyCategory);
    });
}

export async function createDoctorAssistantRelationship(input: {
  doctorId: string;
  assistantId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return createDoctorAssistantRelationships({
    doctorId: input.doctorId,
    assistantIds: [input.assistantId],
    primaryAssistantId: input.assistantId,
  });
}

export async function createDoctorAssistantRelationships(input: {
  doctorId: string;
  assistantIds: string[];
  primaryAssistantId?: string;
  status?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const assistantIds = Array.from(
    new Set(input.assistantIds.filter((assistantId) => Boolean(assistantId))),
  );
  const status: MappingStatusValue =
    input.status === 'INACTIVE' || input.status === 'TEMPORARY'
      ? input.status
      : 'ACTIVE';

  if (!input.doctorId || assistantIds.length === 0) {
    return {
      ok: false,
      message: 'Select a doctor and at least one assistant.',
    };
  }

  if (assistantIds.includes(input.doctorId)) {
    return {
      ok: false,
      message: 'Doctor and assistant must be different users.',
    };
  }

  if (
    input.primaryAssistantId &&
    !assistantIds.includes(input.primaryAssistantId)
  ) {
    return {
      ok: false,
      message: 'Select the primary assistant from the assistants you checked.',
    };
  }

  const [doctor, assistantRows, existing] = await Promise.all([
    db.select().from(users).where(eq(users.id, input.doctorId)).limit(1),
    db.select().from(users).where(inArray(users.id, assistantIds)),
    db
      .select({ assistantId: doctorAssistantMapping.assistantId })
      .from(doctorAssistantMapping)
      .where(
        and(
          eq(doctorAssistantMapping.doctorId, input.doctorId),
          inArray(doctorAssistantMapping.assistantId, assistantIds),
        ),
      ),
  ]);

  const doctorRow = doctor[0];

  if (!doctorRow || doctorRow.role !== 'DOCTOR') {
    return { ok: false, message: 'The selected doctor is invalid.' };
  }

  if (
    assistantRows.length !== assistantIds.length ||
    assistantRows.some((assistant) => assistant.role !== 'ASSISTANT')
  ) {
    return {
      ok: false,
      message: 'One or more selected assistants are invalid.',
    };
  }

  if (existing.length > 0) {
    return {
      ok: false,
      message:
        'One or more selected doctor-assistant relationships already exist.',
    };
  }

  await db.insert(doctorAssistantMapping).values(
    assistantIds.map((assistantId) => ({
      doctorId: input.doctorId,
      assistantId,
      isPrimary: assistantId === input.primaryAssistantId,
      status,
    })),
  );

  return { ok: true };
}

export async function deleteDoctorAssistantRelationship(
  id: string,
): Promise<void> {
  await db
    .delete(doctorAssistantMapping)
    .where(eq(doctorAssistantMapping.id, id));
}

export async function updateDoctorAssistantRelationship(input: {
  relationshipId: string;
  status?: string;
  isPrimary: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const status: MappingStatusValue =
    input.status === 'INACTIVE' || input.status === 'TEMPORARY'
      ? input.status
      : 'ACTIVE';

  if (!input.relationshipId) {
    return {
      ok: false,
      message: 'Missing doctor-assistant relationship id.',
    };
  }

  const relationshipRows = await db
    .select()
    .from(doctorAssistantMapping)
    .where(eq(doctorAssistantMapping.id, input.relationshipId))
    .limit(1);

  const relationship = relationshipRows[0];

  if (!relationship) {
    return {
      ok: false,
      message: 'The selected doctor-assistant relationship no longer exists.',
    };
  }

  if (input.isPrimary) {
    await db
      .update(doctorAssistantMapping)
      .set({ isPrimary: false })
      .where(eq(doctorAssistantMapping.doctorId, relationship.doctorId));
  }

  await db
    .update(doctorAssistantMapping)
    .set({
      isPrimary: input.isPrimary,
      status,
    })
    .where(eq(doctorAssistantMapping.id, input.relationshipId));

  return { ok: true };
}

export async function createDoctorSpecialtyRelationship(input: {
  doctorId: string;
  specialtyId: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return createDoctorSpecialtyRelationships({
    doctorId: input.doctorId,
    specialtyIds: [input.specialtyId],
  });
}

export async function createDoctorSpecialtyRelationships(input: {
  doctorId: string;
  specialtyIds: number[];
  primarySpecialtyId?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!input.doctorId || input.specialtyIds.length === 0) {
    return {
      ok: false,
      message: 'Select a doctor and at least one specialty.',
    };
  }

  if (input.specialtyIds.some((id) => Number.isNaN(id))) {
    return {
      ok: false,
      message: 'One or more selected specialties are invalid.',
    };
  }

  const [doctorRows, specialtyRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, input.doctorId)).limit(1),
    db
      .select({ id: specialties.id })
      .from(specialties)
      .where(inArray(specialties.id, input.specialtyIds)),
  ]);

  const doctorRow = doctorRows[0];

  if (!doctorRow || doctorRow.role !== 'DOCTOR') {
    return { ok: false, message: 'The selected doctor is invalid.' };
  }

  if (specialtyRows.length !== input.specialtyIds.length) {
    return {
      ok: false,
      message: 'One or more selected specialties are invalid.',
    };
  }

  await db
    .insert(userSpecialties)
    .values(
      input.specialtyIds.map((specialtyId) => ({
        userId: input.doctorId,
        specialtyId,
        isPrimary: specialtyId === input.primarySpecialtyId,
      })),
    )
    .onConflictDoNothing();

  return { ok: true };
}

export async function deleteDoctorSpecialtyRelationship(input: {
  doctorId: string;
  specialtyId: number;
}): Promise<void> {
  await db
    .delete(userSpecialties)
    .where(
      and(
        eq(userSpecialties.userId, input.doctorId),
        eq(userSpecialties.specialtyId, input.specialtyId),
      ),
    );
}
