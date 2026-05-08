import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { specialties } from '@/lib/schema';

export type Specialty = typeof specialties.$inferSelect;
export type SpecialtyInsert = typeof specialties.$inferInsert;

// GET operations
export async function listSpecialties(): Promise<Specialty[]> {
  return db.select().from(specialties).orderBy(specialties.codeRange);
}

export async function getSpecialtyById(id: number): Promise<Specialty | null> {
  const rows = await db
    .select()
    .from(specialties)
    .where(eq(specialties.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSpecialtyByCodeRange(
  codeRange: string,
): Promise<Specialty | null> {
  const rows = await db
    .select()
    .from(specialties)
    .where(eq(specialties.codeRange, codeRange))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSpecialtyByCategory(
  category: string,
): Promise<Specialty | null> {
  const rows = await db
    .select()
    .from(specialties)
    .where(eq(specialties.category, category))
    .limit(1);
  return rows[0] ?? null;
}

// CREATE operation
export async function createSpecialty(
  data: SpecialtyInsert,
): Promise<Specialty> {
  const rows = await db.insert(specialties).values(data).returning();
  return rows[0];
}

// UPDATE operation
export async function updateSpecialty(
  id: number,
  data: Partial<SpecialtyInsert>,
): Promise<Specialty | null> {
  const rows = await db
    .update(specialties)
    .set(data)
    .where(eq(specialties.id, id))
    .returning();
  return rows[0] ?? null;
}

// DELETE operation
export async function deleteSpecialty(id: number): Promise<boolean> {
  const result = await db.delete(specialties).where(eq(specialties.id, id));
  return (result.rowCount ?? 0) > 0;
}
