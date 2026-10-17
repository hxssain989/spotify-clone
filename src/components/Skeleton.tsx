export function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 py-2">
      <div className="h-12 w-12 rounded bg-surface-highlight" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-surface-highlight" />
        <div className="h-3 w-1/2 rounded bg-surface-highlight" />
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="w-36 shrink-0 animate-pulse">
      <div className="aspect-square rounded-md bg-surface-highlight" />
      <div className="mt-2 h-3 w-full rounded bg-surface-highlight" />
      <div className="mt-2 h-3 w-2/3 rounded bg-surface-highlight" />
    </div>
  )
}
