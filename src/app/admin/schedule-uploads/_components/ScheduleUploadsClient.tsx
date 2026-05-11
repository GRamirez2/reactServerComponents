'use client';

import { useActionState, useCallback, useMemo, useState } from 'react';
import EpicSpreadsheetUpload from './EpicSpreadsheetUpload';
import CalendarSpreadsheetUpload from './CalendarSpreadsheetUpload';
import {
  createEpicAssignmentsAction,
  type CreateAssignmentsActionState,
  previewEpicAssignmentsAction,
  type PreviewAssignmentsActionState,
} from '../_actions/parseEpicData';

export default function ScheduleUploadsClient() {
  const [epicUploaded, setEpicUploaded] = useState(false);
  const [calendarUploaded, setCalendarUploaded] = useState(false);
  const [epicRows, setEpicRows] = useState<Record<string, string>[]>([]);
  const [epicFileName, setEpicFileName] = useState('');
  const [previewedEpicJson, setPreviewedEpicJson] = useState<string | null>(
    null,
  );

  const initialCreateState: CreateAssignmentsActionState = {
    errorMessage: null,
    successMessage: null,
    insertedCount: 0,
    skippedCount: 0,
  };
  const [createState, createFormAction, isCreatingAssignments] = useActionState(
    createEpicAssignmentsAction,
    initialCreateState,
  );

  const initialPreviewState: PreviewAssignmentsActionState = {
    errorMessage: null,
    preview: null,
  };
  const [previewState, previewFormAction, isPreviewingAssignments] =
    useActionState(previewEpicAssignmentsAction, initialPreviewState);

  const handleEpicUpload = useCallback(
    (hasUpload: boolean, rows: Record<string, string>[], fileName: string) => {
      setEpicUploaded(hasUpload);
      setEpicRows(hasUpload ? rows : []);
      setEpicFileName(hasUpload ? fileName : '');
      setPreviewedEpicJson(null);
    },
    [],
  );

  const handleCalendarUpload = useCallback((hasUpload: boolean) => {
    setCalendarUploaded(hasUpload);
  }, []);

  const bothUploaded = epicUploaded && calendarUploaded;
  const serializedEpicRows = useMemo(
    () => JSON.stringify(epicRows),
    [epicRows],
  );
  const isPreviewFresh =
    Boolean(previewState.preview) &&
    Boolean(previewedEpicJson) &&
    previewedEpicJson === serializedEpicRows;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-2">
        <EpicSpreadsheetUpload onUploadSuccess={handleEpicUpload} />
        <CalendarSpreadsheetUpload onUploadSuccess={handleCalendarUpload} />
      </section>

      {bothUploaded ? (
        <form
          action={previewFormAction}
          className="space-y-3"
          onSubmit={() => setPreviewedEpicJson(serializedEpicRows)}
        >
          <input type="hidden" name="epicJson" value={serializedEpicRows} />
          <button
            type="submit"
            disabled={
              isPreviewingAssignments ||
              isCreatingAssignments ||
              epicRows.length === 0
            }
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isPreviewingAssignments
              ? 'Building preview...'
              : 'Preview Assignments'}
          </button>
        </form>
      ) : null}

      {isPreviewFresh && previewState.preview ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-base font-semibold text-slate-900">
            Assignment Preview
          </h4>
          <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-medium text-slate-900">Total rows</dt>
              <dd>{previewState.preview.totalRows}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Rows with CASE_ID</dt>
              <dd>{previewState.preview.rowsWithCaseId}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Specialty matches</dt>
              <dd>{previewState.preview.specialtyMatchedRows}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Doctor matches</dt>
              <dd>{previewState.preview.doctorMatchedRows}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Skipped rows</dt>
              <dd>{previewState.preview.skippedRows}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">
                Matched specialties
              </dt>
              <dd>{previewState.preview.uniqueMatchedSpecialties}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Matched doctors</dt>
              <dd>{previewState.preview.uniqueMatchedDoctors}</dd>
            </div>
          </dl>

          {previewState.preview.topSpecialties.length > 0 ? (
            <div>
              <h5 className="text-sm font-semibold text-slate-900">
                Top specialties by matched rows
              </h5>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {previewState.preview.topSpecialties.map((specialty) => (
                  <li key={specialty.specialtyId}>
                    {specialty.codeRange}: {specialty.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewState.preview.topDoctors.length > 0 ? (
            <div>
              <h5 className="text-sm font-semibold text-slate-900">
                Top doctors by assigned rows
              </h5>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {previewState.preview.topDoctors.map((doctor) => (
                  <li key={doctor.doctorId}>
                    {doctor.doctorEmail}: {doctor.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form action={createFormAction}>
            <input type="hidden" name="epicJson" value={serializedEpicRows} />
            <input
              type="hidden"
              name="previewEpicJson"
              value={previewedEpicJson ?? ''}
            />
            <input type="hidden" name="fileName" value={epicFileName} />
            <button
              type="submit"
              disabled={
                isCreatingAssignments ||
                !isPreviewFresh ||
                previewState.preview.doctorMatchedRows === 0
              }
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isCreatingAssignments
                ? 'Creating assignments...'
                : 'Create Assignments'}
            </button>
          </form>
        </section>
      ) : null}

      {previewState.preview && !isPreviewFresh ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Epic data changed after preview. Click Preview Assignments again
          before creating.
        </p>
      ) : null}

      {previewState.errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {previewState.errorMessage}
        </p>
      ) : null}

      {createState.errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {createState.errorMessage}
        </p>
      ) : null}

      {createState.successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {createState.successMessage}
        </p>
      ) : null}
    </div>
  );
}
