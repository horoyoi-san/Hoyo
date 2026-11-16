// Shared by loading.tsx and the data gates.
export default function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="w-full animate-pulse space-y-4 pt-2">
      <div className="h-10 rounded-xl bg-base-200/70" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl bg-base-200/60" />
        <div className="h-64 rounded-2xl bg-base-200/60" />
      </div>
      <div className="h-40 rounded-2xl bg-base-200/50" />
    </div>
  );
}
