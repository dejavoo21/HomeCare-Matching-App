export default function LoadingState({
  rows = 4,
  cards = false,
}: {
  rows?: number;
  cards?: boolean;
}) {
  if (cards) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
  );
}
