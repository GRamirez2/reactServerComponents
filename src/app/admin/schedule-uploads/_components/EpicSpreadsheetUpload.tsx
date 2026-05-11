'use client';

import { useActionState, useEffect } from 'react';
import {
  parseEpicData,
  type ParseEpicActionState,
} from '../_actions/parseEpicData';

type EpicSpreadsheetUploadProps = {
  onUploadSuccess?: (
    hasUpload: boolean,
    rows: Record<string, string>[],
    fileName: string,
  ) => void;
};

export default function EpicSpreadsheetUpload({
  onUploadSuccess,
}: EpicSpreadsheetUploadProps) {
  const initialState: ParseEpicActionState = {
    errorMessage: null,
    result: null,
  };
  const [state, formAction, isPending] = useActionState(
    parseEpicData,
    initialState,
  );

  useEffect(() => {
    if (state.result) {
      onUploadSuccess?.(true, state.result.json, state.result.fileName);
    }
  }, [state.result, onUploadSuccess]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h4 className="text-lg font-semibold text-slate-900">
          Daily Epic Upload
        </h4>
        <p className="text-sm text-slate-600">
          Upload the latest data from Epic.
        </p>
      </div>
      <form className="space-y-4" action={formAction}>
        <div>
          <label
            htmlFor="document"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Select spreadsheet
          </label>
          <input
            id="document"
            name="document"
            type="file"
            accept=".xlsx,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12"
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
          />
          <p className="mt-2 text-sm text-gray-500">
            Accepted file types: .xlsx and .xlsb. Parsed JSON is currently
            available for .xlsx via officeparser.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isPending ? 'Parsing spreadsheet...' : 'Upload Epic Data'}
        </button>
      </form>

      {state.errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.errorMessage}
        </p>
      ) : null}

      {state.result ? (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Parsed JSON</h2>
            <p className="text-sm text-gray-600">
              Showing the parsed rows for {state.result.fileName}.
            </p>
          </div>

          <pre className="max-h-128 overflow-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-100">
            {JSON.stringify(state.result.json, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
