import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
