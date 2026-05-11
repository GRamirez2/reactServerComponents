import { listUploadsWithTaskCounts } from '@/lib/repositories/uploadsRepository';

export default async function UploadsInfo() {
  const uploads = await listUploadsWithTaskCounts();

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 text-base font-semibold text-slate-900">
        Epic Upload Assignments Totals by day
      </h4>

      {uploads.length === 0 ? (
        <p className="text-sm text-slate-500">No uploads found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">File Name</th>
                <th className="pb-2 text-right">Tasks Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uploads.map((upload) => (
                <tr key={upload.id}>
                  <td className="py-2 pr-4 tabular-nums text-slate-500">
                    {upload.id}
                  </td>
                  <td className="py-2 pr-4 text-nowrap text-slate-500">
                    {upload.createdAt
                      ? new Date(upload.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="py-2 pr-4 font-medium">{upload.fileName}</td>
                  <td className="py-2 text-right tabular-nums">
                    {upload.taskCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
