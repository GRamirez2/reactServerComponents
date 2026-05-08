import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { listSpecialties } from '@/lib/repositories/specialtiesRepository';
import RelationshipsToast from './RelationshipsToast';
import {
  createDoctorAssistantRelationships,
  createDoctorSpecialtyRelationships,
  deleteDoctorAssistantRelationship,
  deleteDoctorSpecialtyRelationship,
  listDoctorAssistantRelationships,
  listDoctorSpecialtyRelationships,
  listUsersByRole,
  updateDoctorAssistantRelationship,
  updateDoctorSpecialtyRelationship,
} from '@/lib/repositories/relationshipsRepository';

type RelationshipsSearchParams = Promise<{
  toast?: string;
  details?: string;
}>;

function buildRelationshipsPageHref(options?: {
  toast?: string;
  details?: string;
}) {
  const params = new URLSearchParams();

  if (options?.toast) {
    params.set('toast', options.toast);
  }

  if (options?.details) {
    params.set('details', options.details);
  }

  const query = params.toString();
  return query ? `/admin/relationships?${query}` : '/admin/relationships';
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function AdminRelationshipsPage({
  searchParams,
}: {
  searchParams: RelationshipsSearchParams;
}) {
  const params = await searchParams;
  const toast = params.toast;
  const details = params.details;

  const [
    doctors,
    assistants,
    specialties,
    doctorAssistants,
    doctorSpecialties,
  ] = await Promise.all([
    listUsersByRole('DOCTOR'),
    listUsersByRole('ASSISTANT'),
    listSpecialties(),
    listDoctorAssistantRelationships(),
    listDoctorSpecialtyRelationships(),
  ]);

  async function createDoctorAssistantAction(formData: FormData) {
    'use server';

    const doctorId = String(formData.get('doctorId') ?? '');
    const assistantIds = formData
      .getAll('assistantId')
      .map((value) => String(value));
    const primaryAssistantIdRaw = formData.get('primaryAssistantId');
    const primaryAssistantId = primaryAssistantIdRaw
      ? String(primaryAssistantIdRaw)
      : undefined;
    const status = String(formData.get('status') ?? 'ACTIVE');
    const result = await createDoctorAssistantRelationships({
      doctorId,
      assistantIds,
      primaryAssistantId,
      status,
    });

    revalidatePath('/admin/relationships');
    redirect(
      buildRelationshipsPageHref({
        toast: result.ok ? 'success' : 'error',
        details: result.ok
          ? `Doctor-assistant relationship${assistantIds.length > 1 ? 's' : ''} created.`
          : result.message,
      }),
    );
  }

  async function deleteDoctorAssistantAction(formData: FormData) {
    'use server';

    const relationshipId = String(formData.get('relationshipId') ?? '');

    if (!relationshipId) {
      redirect(
        buildRelationshipsPageHref({
          toast: 'error',
          details: 'Missing doctor-assistant relationship id.',
        }),
      );
    }

    await deleteDoctorAssistantRelationship(relationshipId);
    revalidatePath('/admin/relationships');
    redirect(
      buildRelationshipsPageHref({
        toast: 'success',
        details: 'Doctor-assistant relationship removed.',
      }),
    );
  }

  async function updateDoctorAssistantAction(formData: FormData) {
    'use server';

    const relationshipId = String(formData.get('relationshipId') ?? '');
    const status = String(formData.get('status') ?? 'ACTIVE');
    const isPrimary = formData.get('isPrimary') === 'true';
    const result = await updateDoctorAssistantRelationship({
      relationshipId,
      status,
      isPrimary,
    });

    revalidatePath('/admin/relationships');
    redirect(
      buildRelationshipsPageHref({
        toast: result.ok ? 'success' : 'error',
        details: result.ok
          ? 'Doctor-assistant relationship updated.'
          : result.message,
      }),
    );
  }

  async function createDoctorSpecialtyAction(formData: FormData) {
    'use server';

    const doctorId = String(formData.get('doctorId') ?? '');
    const specialtyIds = formData
      .getAll('specialtyId')
      .map((v) => Number.parseInt(String(v), 10));
    const primarySpecialtyIdRaw = formData.get('primarySpecialtyId');
    const primarySpecialtyId = primarySpecialtyIdRaw
      ? Number.parseInt(String(primarySpecialtyIdRaw), 10)
      : undefined;
    const result = await createDoctorSpecialtyRelationships({
      doctorId,
      specialtyIds,
      primarySpecialtyId,
    });

    revalidatePath('/admin/relationships');
    redirect(
      buildRelationshipsPageHref({
        toast: result.ok ? 'success' : 'error',
        details: result.ok
          ? `Doctor-specialty relationship${specialtyIds.length > 1 ? 's' : ''} created.`
          : result.message,
      }),
    );
  }

  async function deleteDoctorSpecialtyAction(formData: FormData) {
    'use server';

    const doctorId = String(formData.get('doctorId') ?? '');
    const specialtyId = Number.parseInt(
      String(formData.get('specialtyId') ?? ''),
      10,
    );

    if (!doctorId || Number.isNaN(specialtyId)) {
      redirect(
        buildRelationshipsPageHref({
          toast: 'error',
          details: 'Missing doctor-specialty relationship values.',
        }),
      );
    }

    await deleteDoctorSpecialtyRelationship({ doctorId, specialtyId });
    revalidatePath('/admin/relationships');
    redirect(
      buildRelationshipsPageHref({
        toast: 'success',
        details: 'Doctor-specialty relationship removed.',
      }),
    );
  }

  async function updateDoctorSpecialtyAction(formData: FormData) {
    'use server';

    const doctorId = String(formData.get('doctorId') ?? '');
    const specialtyId = Number.parseInt(
      String(formData.get('specialtyId') ?? ''),
      10,
    );
    const isPrimary = formData.get('isPrimary') === 'true';
    const result = await updateDoctorSpecialtyRelationship({
      doctorId,
      specialtyId,
      isPrimary,
    });

    revalidatePath('/admin/relationships');
    redirect(
      buildRelationshipsPageHref({
        toast: result.ok ? 'success' : 'error',
        details: result.ok
          ? 'Doctor-specialty relationship updated.'
          : result.message,
      }),
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight">Relationships</h3>
        <p className="text-sm text-slate-600">
          Create and review doctor-assistant assignments and doctor-specialty
          mappings.
        </p>
      </div>

      {toast && details ? (
        <RelationshipsToast
          tone={toast === 'error' ? 'error' : 'success'}
          message={details}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={createDoctorAssistantAction}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-slate-900">
              Doctor to Assistant
            </h4>
            <p className="text-sm text-slate-600">
              Pair doctors with one or more assistants.
            </p>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Doctor</span>
            <select
              name="doctorId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.email}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-slate-700">Assistant</legend>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-3">
              {assistants.map((assistant) => (
                <label
                  key={assistant.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent bg-white px-3 py-2 transition hover:border-slate-200 hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    name="assistantId"
                    value={assistant.id}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <span className="flex flex-1 items-center justify-between gap-2">
                    <span className="block font-medium text-slate-900">
                      {assistant.email}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="radio"
                        name="primaryAssistantId"
                        value={assistant.id}
                        className="h-3.5 w-3.5 border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                      Primary
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Select one or more assistants. If needed, choose one primary
              assistant.
            </p>
          </fieldset>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              name="status"
              defaultValue="ACTIVE"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="TEMPORARY">TEMPORARY</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create relationship
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h4 className="text-lg font-semibold text-slate-900">
              Current Doctor-Assistant Relationships
            </h4>
            <p className="text-sm text-slate-600">
              Review active pairings and remove outdated ones.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Doctor</th>
                  <th className="px-3 py-2">Assistant</th>
                  <th className="px-3 py-2">Primary</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Assigned</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {doctorAssistants.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={6}>
                      No doctor-assistant relationships yet.
                    </td>
                  </tr>
                ) : (
                  doctorAssistants.map((relationship) => (
                    <tr key={relationship.id}>
                      <td className="px-3 py-3 align-middle">
                        <p className="font-medium text-slate-900">
                          {relationship.doctorEmail}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle text-slate-700">
                        {relationship.assistantEmail}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <select
                          name="isPrimary"
                          form={`doctor-assistant-update-${relationship.id}`}
                          defaultValue={
                            relationship.isPrimary ? 'true' : 'false'
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <select
                          name="status"
                          form={`doctor-assistant-update-${relationship.id}`}
                          defaultValue={relationship.status ?? 'ACTIVE'}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="TEMPORARY">TEMPORARY</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 align-middle text-slate-500">
                        {formatDateTime(relationship.assignedAt)}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <form
                          id={`doctor-assistant-update-${relationship.id}`}
                          action={updateDoctorAssistantAction}
                          className="mb-2"
                        >
                          <input
                            type="hidden"
                            name="relationshipId"
                            value={relationship.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
                          >
                            Save
                          </button>
                        </form>
                        <form action={deleteDoctorAssistantAction}>
                          <input
                            type="hidden"
                            name="relationshipId"
                            value={relationship.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={createDoctorSpecialtyAction}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-slate-900">
              Doctor to Specialty
            </h4>
            <p className="text-sm text-slate-600">
              Assign specialties to doctors.
            </p>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Doctor</span>
            <select
              name="doctorId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
            >
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.email}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-slate-700">Specialty</legend>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-3">
              {specialties.map((specialty) => (
                <label
                  key={specialty.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent bg-white px-3 py-2 transition hover:border-slate-200 hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    name="specialtyId"
                    value={specialty.id}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <span className="flex flex-1 items-start justify-between gap-2">
                    <span className="space-y-0.5">
                      <span className="block font-medium text-slate-900">
                        {specialty.category}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {specialty.codeRange}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="radio"
                        name="primarySpecialtyId"
                        value={specialty.id}
                        className="h-3.5 w-3.5 border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                      Primary
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Select one or more specialties, then submit to create the mapping.
            </p>
          </fieldset>

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create specialty mapping
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h4 className="text-lg font-semibold text-slate-900">
              Current Doctor-Specialty Relationships
            </h4>
            <p className="text-sm text-slate-600">
              Review specialty coverage by doctor and remove stale mappings.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Doctor</th>
                  <th className="px-3 py-2">Specialty</th>
                  <th className="px-3 py-2">Primary</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {doctorSpecialties.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={5}>
                      No doctor-specialty relationships yet.
                    </td>
                  </tr>
                ) : (
                  doctorSpecialties.map((relationship) => (
                    <tr
                      key={`${relationship.doctorId}:${relationship.specialtyId}`}
                    >
                      <td className="px-3 py-3 align-middle">
                        <p className="font-medium text-slate-900">
                          {relationship.doctorEmail}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle text-slate-700">
                        <p>{relationship.specialtyCategory}</p>
                        <p className="text-xs text-slate-500">
                          {relationship.specialtyCodeRange}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <select
                          name="isPrimary"
                          form={`doctor-specialty-update-${relationship.doctorId}-${relationship.specialtyId}`}
                          defaultValue={
                            relationship.isPrimary ? 'true' : 'false'
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 align-middle text-slate-500">
                        {formatDateTime(relationship.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <form
                          id={`doctor-specialty-update-${relationship.doctorId}-${relationship.specialtyId}`}
                          action={updateDoctorSpecialtyAction}
                          className="mb-2"
                        >
                          <input
                            type="hidden"
                            name="doctorId"
                            value={relationship.doctorId}
                          />
                          <input
                            type="hidden"
                            name="specialtyId"
                            value={relationship.specialtyId}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
                          >
                            Save
                          </button>
                        </form>
                        <form action={deleteDoctorSpecialtyAction}>
                          <input
                            type="hidden"
                            name="doctorId"
                            value={relationship.doctorId}
                          />
                          <input
                            type="hidden"
                            name="specialtyId"
                            value={relationship.specialtyId}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
