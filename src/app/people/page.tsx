import SpreadsheetUpload from './SpreadsheetUpload';

export default function People() {
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <h1 className="text-3xl font-semibold text-gray-900">Spreadsheet Upload</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Upload an Excel workbook and inspect the parsed JSON returned by officeparser.
      </p>
      <SpreadsheetUpload />
    </main>
  );
}