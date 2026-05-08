'use server';

import { listSpecialties } from '@/lib/repositories/specialtiesRepository';
import { Specialty } from '@/lib/repositories/specialtiesRepository';

export async function getSpecialties(): Promise<Specialty[]> {
  return await listSpecialties();
}
