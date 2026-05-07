'use server';

import { updateSpecialty } from '@/lib/repositories/specialtiesRepository';

export async function editSpecialty(
  id: number,
  codeRange: string,
  category: string,
) {
  try {
    const updated = await updateSpecialty(id, { codeRange, category });
    if (!updated) {
      return { error: 'Specialty not found' };
    }
    return { success: true, specialty: updated };
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return { error: 'Code range or category already exists' };
    }
    return { error: 'Failed to update specialty' };
  }
}
