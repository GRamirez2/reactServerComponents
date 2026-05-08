import ScheduleUploadsClient from './_components/ScheduleUploadsClient';

export default function AdminScheduleUploadsPage() {
  return (
    <main className="space-y-4">
      <h3 className="text-xl font-semibold">Daily Uploads</h3>
      <p>Manage and review daily schedule upload activity.</p>
      <ScheduleUploadsClient />
    </main>
  );
}
