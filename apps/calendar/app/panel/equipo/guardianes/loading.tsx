import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
