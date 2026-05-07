import SpreadsheetUpload from './_components/SpreadsheetUpload';

export default function AdminScheduleUploadsPage() {
  return (
    <main className="space-y-2">
      <h3 className="text-xl font-semibold">Daily Uploads</h3>
      <p>Manage and review daily schedule upload activity.</p>
      <SpreadsheetUpload />
    </main>
  );
}
