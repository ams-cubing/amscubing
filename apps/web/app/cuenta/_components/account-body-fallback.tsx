export function AccountBodyFallback() {
  return (
    <div className="space-y-10" aria-hidden>
      <div className="h-40 animate-pulse rounded-5.5 bg-ams-soft" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-5.5 bg-ams-soft" />
        <div className="h-48 animate-pulse rounded-5.5 bg-ams-soft" />
        <div className="h-48 animate-pulse rounded-5.5 bg-ams-soft" />
      </div>
    </div>
  );
}
