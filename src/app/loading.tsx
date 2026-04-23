export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ink" />
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ink" style={{ animationDelay: "150ms" }} />
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ink" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
