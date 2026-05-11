import UploadsInfo from './_components/UploadsInfo';

export default function AdminTotalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Totals</h3>
        <p className="text-sm text-slate-600">
          Aggregate counts and high-level admin metrics.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <UploadsInfo />
      </div>
    </div>
  );
}
