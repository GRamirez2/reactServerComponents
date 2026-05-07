export default async function AdminTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-2">
      <h3 className="text-xl font-semibold">Task {id}</h3>
      <p>View and manage this task from the admin area.</p>
    </div>
  );
}
