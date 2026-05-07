'use server';

import { createSpecialty } from '@/lib/repositories/specialtiesRepository';

export async function createSpecialtyAction(
  codeRange: string,
  category: string,
) {
  const trimmedCodeRange = codeRange.trim();
  const trimmedCategory = category.trim();

  if (!trimmedCodeRange || !trimmedCategory) {
    return { error: 'Code range and category are required' };
  }

  try {
    const specialty = await createSpecialty({
      codeRange: trimmedCodeRange,
      category: trimmedCategory,
    });
    return { success: true, specialty };
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return { error: 'Code range or category already exists' };
    }
    return { error: 'Failed to create specialty' };
  }
}
