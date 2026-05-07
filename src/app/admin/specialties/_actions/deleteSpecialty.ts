'use server';

import { deleteSpecialty } from '@/lib/repositories/specialtiesRepository';

export async function deleteSpecialtyAction(id: number) {
  try {
    const deleted = await deleteSpecialty(id);
    if (!deleted) {
      return { error: 'Specialty not found' };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('foreign key')) {
      return { error: 'Cannot delete specialty that is in use' };
    }
    return { error: 'Failed to delete specialty' };
  }
}
