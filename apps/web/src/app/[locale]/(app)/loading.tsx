// Data-segment loading state (allowed here; never at the [locale] root, see CLAUDE.md rule 17).
export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
      <div className="h-10 w-72 animate-pulse rounded bg-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
