import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-5 w-full max-w-lg mt-2" />
        </div>
        <Skeleton className="h-[32rem] rounded-lg" />
        <Skeleton className="h-10 w-48" />
      </div>
    </main>
  );
}
