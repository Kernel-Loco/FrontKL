export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8" role="status" aria-label="Cargando">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-lt-raised" />
        <div className="h-4 w-72 rounded bg-lt-raised" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-lt-raised" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-lt-raised" />
    </div>
  );
}
